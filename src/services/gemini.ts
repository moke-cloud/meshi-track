import { getSettings } from '../lib/db'
import { decryptString, unpackCipher } from '../lib/crypto'

/**
 * Gemini API (Google AI Studio) を直接呼ぶクライアント。
 *
 * SDKを使わず REST 直叩きにしてバンドルを軽量化する。
 * エンドポイント仕様: https://ai.google.dev/api/generate-content
 *
 * 認証: URL クエリパラメータ `?key=<API_KEY>` で個人APIキー (AI Studio 発行)。
 * 送信先は必ず `generativelanguage.googleapis.com` に固定し、URL改ざんされないよう注意。
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro'

export const DEFAULT_MODEL: GeminiModel = 'gemini-2.5-flash'

export async function getApiKey(): Promise<string | null> {
  const settings = await getSettings()
  if (!settings?.geminiApiKeyCipher) return null
  try {
    return await decryptString(unpackCipher(settings.geminiApiKeyCipher))
  } catch {
    return null
  }
}

/** 簡単な疎通チェック: 無料枠消費最小限の text-only リクエスト。 */
export async function testConnection(model: GeminiModel = DEFAULT_MODEL): Promise<{ ok: boolean; message: string }> {
  const key = await getApiKey()
  if (!key) return { ok: false, message: 'APIキーが未設定です' }
  try {
    const res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, message: `HTTP ${res.status}: ${errText.slice(0, 200)}` }
    }
    return { ok: true, message: 'OK' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'unknown error' }
  }
}

export interface VisionItem {
  foodName: string
  /** 推定グラム数 (可食部) */
  estimatedGrams: number
  /** 推定カロリー (kcal) */
  estimatedKcal: number
  /** 推定タンパク質 (g) */
  estimatedProteinG: number
  /** 推定脂質 (g) */
  estimatedFatG: number
  /** 推定炭水化物 (g) */
  estimatedCarbG: number
  /** 認識の信頼度 */
  confidence: 'high' | 'medium' | 'low'
  /** 備考 (調理方法の推測、具材など) */
  notes?: string
}

const VISION_PROMPT = `この写真に写っている食べ物を分析してください。

厳守事項:
- 複数の料理・食材が写っている場合は配列で全て列挙
- グラム数は可食部(食べられる部分)の推定値
- 栄養素は日本食品標準成分表2020年版(八訂)ベースで推定
- 不明瞭な場合は confidence: "low" とし notes に「要確認」と記載
- 料理名は一般的な日本語名で (例: "白米ごはん", "鶏のから揚げ", "豚汁", "味噌汁(豆腐とわかめ)")
- 値が不明な場合は 0 を入れる (null不可)`

/** Gemini の responseSchema で構造化JSON出力を強制する定義。 */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          foodName: { type: 'string' },
          estimatedGrams: { type: 'number' },
          estimatedKcal: { type: 'number' },
          estimatedProteinG: { type: 'number' },
          estimatedFatG: { type: 'number' },
          estimatedCarbG: { type: 'number' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string' },
        },
        required: [
          'foodName',
          'estimatedGrams',
          'estimatedKcal',
          'estimatedProteinG',
          'estimatedFatG',
          'estimatedCarbG',
          'confidence',
        ],
      },
    },
  },
  required: ['items'],
} as const

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    finishReason?: string
    safetyRatings?: unknown
  }[]
  promptFeedback?: { blockReason?: string; safetyRatings?: unknown }
  error?: { code?: number; message?: string; status?: string }
}

/**
 * 画像(Base64 or Blob)を Gemini Vision で料理認識。
 */
export async function recognizeFoodImage(
  imageBase64: string,
  mimeType: string,
  model: GeminiModel = DEFAULT_MODEL,
): Promise<VisionItem[]> {
  const key = await getApiKey()
  if (!key) throw new Error('Gemini APIキーが未設定です (設定画面で入力してください)')

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: VISION_PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  })

  const bodyText = await res.text()
  if (!res.ok) {
    // エラーBody を可能な限り解析してメッセージ化
    let detail = bodyText.slice(0, 400)
    try {
      const parsed = JSON.parse(bodyText) as GeminiResponse
      if (parsed.error?.message) detail = `${parsed.error.status ?? ''} ${parsed.error.message}`
    } catch {
      // bodyText をそのまま使う
    }
    throw new Error(`Gemini API エラー (${res.status}): ${detail}`)
  }

  let body: GeminiResponse
  try {
    body = JSON.parse(bodyText) as GeminiResponse
  } catch {
    throw new Error('Gemini: 応答本体がJSONでありません')
  }

  // プロンプトレベルでブロック (SafetyまたはBlocklist)
  if (body.promptFeedback?.blockReason) {
    throw new Error(`Gemini がリクエストをブロックしました: ${body.promptFeedback.blockReason}`)
  }

  const cand = body.candidates?.[0]
  if (!cand) {
    throw new Error('Gemini: candidates が空です (画像が認識できなかった可能性)')
  }
  const reason = cand.finishReason
  const text = cand.content?.parts?.[0]?.text ?? ''

  // finishReason の分岐処理
  if (!text) {
    if (reason === 'SAFETY') {
      throw new Error('Gemini: 安全性フィルタで応答がブロックされました')
    }
    if (reason === 'MAX_TOKENS') {
      throw new Error('Gemini: 応答が長すぎて切り詰められました (写真の品目を減らすか Pro モデルを試してください)')
    }
    if (reason === 'RECITATION') {
      throw new Error('Gemini: 既存コンテンツの再生産と判定されブロックされました')
    }
    throw new Error(`Gemini: 応答テキストが空です (finishReason=${reason ?? 'unknown'})`)
  }

  // 構造化JSON出力を responseSchema で強制しているが、念のためパースフォールバック付き
  let parsed: { items?: VisionItem[] } | null = null
  try {
    parsed = JSON.parse(text) as { items?: VisionItem[] }
  } catch {
    // responseSchema 指定しているのでここに来ることは稀だが、念のため波括弧抽出
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        parsed = JSON.parse(m[0]) as { items?: VisionItem[] }
      } catch {
        // フォールバックも失敗
      }
    }
  }

  if (!parsed) {
    // eslint-disable-next-line no-console
    console.warn('[Gemini] JSONパース失敗の生応答:', text.slice(0, 500))
    throw new Error(`Gemini: JSONパース失敗 (応答冒頭: ${text.slice(0, 80)}...)`)
  }
  if (!Array.isArray(parsed.items)) {
    // eslint-disable-next-line no-console
    console.warn('[Gemini] items配列が無い応答:', parsed)
    throw new Error('Gemini: items 配列が見つかりません')
  }
  if (parsed.items.length === 0) {
    throw new Error('Gemini: 写真から食品が検出されませんでした')
  }

  return parsed.items
}

/** File/Blob を base64 文字列に変換 (data URL のヘッダ部は除外) */
export async function fileToBase64(file: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const m = result.match(/^data:([^;]+);base64,(.+)$/)
      if (!m) return reject(new Error('base64 変換失敗'))
      resolve({ mimeType: m[1], base64: m[2] })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
