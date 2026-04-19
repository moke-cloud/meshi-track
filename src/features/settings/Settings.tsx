import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../../lib/db'
import { encryptString, packCipher } from '../../lib/crypto'
import { testConnection, DEFAULT_MODEL, type GeminiModel } from '../../services/gemini'
import type { AppSettings } from '../../lib/types'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [model, setModel] = useState<GeminiModel>(DEFAULT_MODEL)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    getSettings().then((s) => {
      if (s) {
        setSettings(s)
        setModel((s as AppSettings & { geminiModel?: GeminiModel }).geminiModel ?? DEFAULT_MODEL)
      }
    })
  }, [])

  const hasStoredKey = Boolean(settings?.geminiApiKeyCipher)

  async function handleSaveKey() {
    if (!keyInput.trim()) return
    setSaving(true)
    setTestResult(null)
    try {
      const cipher = packCipher(await encryptString(keyInput.trim()))
      const next: AppSettings = {
        id: 'settings',
        ...settings,
        geminiApiKeyCipher: cipher,
        enableVision: true,
      }
      await saveSettings(next)
      setSettings(next)
      setKeyInput('')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveKey() {
    if (!confirm('Gemini APIキーを削除しますか？')) return
    const next: AppSettings = {
      id: 'settings',
      ...settings,
      geminiApiKeyCipher: undefined,
      enableVision: false,
    }
    await saveSettings(next)
    setSettings(next)
    setTestResult(null)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await testConnection(model)
      setTestResult(r)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">設定</h1>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-500"
        >
          戻る
        </button>
      </header>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">📷 画像認識 (Gemini API)</h2>
          <p className="text-xs text-slate-500 mt-1">
            写真から料理を認識して複数品目をまとめて記録できます。
            Google AI Studio ( <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline">aistudio.google.com</a> ) で無料APIキーを取得してください。
            キーはこの端末のIndexedDB内で AES-GCM 暗号化され、外部に送信されません。
          </p>
        </div>

        <div>
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-300">APIキー</span>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={hasStoredKey ? '保存済 (上書きする場合のみ入力)' : 'AIza...'}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-base font-mono"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSaveKey}
              disabled={!keyInput.trim() || saving}
              className="flex-1 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? '保存中...' : hasStoredKey ? '上書き保存' : '保存'}
            </button>
            {hasStoredKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-sm"
              >
                削除
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-300">モデル</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as GeminiModel)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-base"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (高速・無料枠大)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (高精度・制限厳)</option>
            </select>
          </label>
        </div>

        {hasStoredKey && (
          <div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
            >
              {testing ? '接続テスト中...' : '接続テスト (ping送信)'}
            </button>
            {testResult && (
              <div
                className={`mt-2 rounded-lg p-3 text-xs ${
                  testResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {testResult.ok ? '✓ 接続成功' : `✗ ${testResult.message}`}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-sm font-semibold mb-2">🏷 バーコードスキャン</h2>
        <p className="text-xs text-slate-500">
          Open Food Facts (無料・オープンデータ) で市販商品を検索します。APIキー不要。
          日本商品のカバー率は30〜50%程度のため、未ヒット時は手動登録にフォールバックします。
        </p>
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-sm font-semibold mb-2">🗑 データ管理</h2>
        <p className="text-xs text-slate-500">
          すべてのデータは端末の IndexedDB に保存されています。端末故障時に備え、
          定期的に設定画面からエクスポート (準備中) するか、Google Drive バックアップ (準備中) を有効化してください。
        </p>
      </section>
    </div>
  )
}
