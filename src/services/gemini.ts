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

const VISION_PROMPT = `この写真に写っている食べ物を分析し、次のJSON形式で返してください。

厳守事項:
- 必ず JSON のみを返す (マークダウンの\`\`\`や説明文は不要)
- 複数の料理・食材が写っている場合は配列で全て列挙
- グラム数は可食部(食べられる部分)の推定値
- 栄養素は日本食品標準成分表2020年版(八訂)ベースで推定
- 不明瞭な場合は confidence: "low" とし notes に「要確認」と記載
- 料理名は一般的な日本語名で (例: "白米ごはん", "鶏のから揚げ", "味噌汁(豆腐とわかめ)")

形式:
{
  "items": [
    {
      "foodName": "白米ごはん",
      "estimatedGrams": 150,
      "estimatedKcal": 234,
      "estimatedProteinG": 3.8,
      "estimatedFatG": 0.5,
      "estimatedCarbG": 55.7,
      "confidence": "high",
      "notes": "茶碗1杯分"
    }
  ]
}`

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
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`)
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini: 応答が空です')

  let parsed: { items?: VisionItem[] }
  try {
    parsed = JSON.parse(text) as { items?: VisionItem[] }
  } catch {
    // 時々前後にバッククォートやテキストが混入するためフォールバックで抽出
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Gemini: JSON パース失敗')
    parsed = JSON.parse(m[0]) as { items?: VisionItem[] }
  }
  if (!Array.isArray(parsed.items)) throw new Error('Gemini: items 配列が見つかりません')
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
