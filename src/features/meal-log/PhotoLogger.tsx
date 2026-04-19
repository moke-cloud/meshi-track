import { useRef, useState } from 'react'
import { fileToBase64, recognizeFoodImage, type VisionItem } from '../../services/gemini'
import type { MealItem } from '../../lib/types'

interface PhotoLoggerProps {
  onItemsDetected: (items: MealItem[]) => void
  onCancel: () => void
}

interface EditableItem extends VisionItem {
  selected: boolean
}

function toMealItem(item: EditableItem): MealItem {
  const g = item.estimatedGrams
  return {
    foodId: `vision:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    foodName: item.foodName,
    grams: g,
    nutrients: {
      kcal: item.estimatedKcal,
      protein_g: item.estimatedProteinG,
      fat_g: item.estimatedFatG,
      carb_g: item.estimatedCarbG,
    },
  }
}

export function PhotoLogger({ onItemsDetected, onCancel }: PhotoLoggerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setLoading(true)
    setItems([])
    setPreviewUrl(URL.createObjectURL(file))
    try {
      const { base64, mimeType } = await fileToBase64(file)
      const detected = await recognizeFoodImage(base64, mimeType)
      setItems(detected.map((d) => ({ ...d, selected: true })))
    } catch (err) {
      setError(err instanceof Error ? err.message : '認識に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function updateItem(idx: number, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function handleConfirm() {
    const mealItems = items.filter((i) => i.selected).map(toMealItem)
    onItemsDetected(mealItems)
  }

  const totalKcal = items
    .filter((i) => i.selected)
    .reduce((acc, i) => acc + i.estimatedKcal, 0)

  return (
    <div className="space-y-3">
      {!previewUrl && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
          >
            📷 写真を撮影
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-600"
          >
            🖼 ライブラリから選択
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
          <p className="text-xs text-slate-500 text-center">
            Gemini Vision が料理を認識し、複数品目の栄養素を推定します。
            設定画面で Gemini API キーを登録してください。
          </p>
        </div>
      )}

      {previewUrl && (
        <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 aspect-square">
          <img src={previewUrl} alt="料理" className="w-full h-full object-cover" />
        </div>
      )}

      {loading && (
        <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-4 text-center text-sm">
          🔍 料理を認識中...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3">
          {error}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="text-xs text-slate-500">
            検出 {items.length} 品目 · 選択中合計 {Math.round(totalKcal)} kcal
          </div>

          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li
                key={idx}
                className={`rounded-xl border p-3 ${
                  it.selected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={it.selected}
                    onChange={(e) => updateItem(idx, { selected: e.target.checked })}
                    className="mt-1.5"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={it.foodName}
                      onChange={(e) => updateItem(idx, { foodName: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium border-b border-slate-200 dark:border-slate-600 pb-0.5 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100"
                    />
                    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto] gap-1 items-center text-xs">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={it.estimatedGrams}
                        onChange={(e) =>
                          updateItem(idx, { estimatedGrams: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-transparent text-right tabular-nums border-b border-slate-200 dark:border-slate-600"
                      />
                      <span className="text-slate-500">g</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={Math.round(it.estimatedKcal)}
                        onChange={(e) =>
                          updateItem(idx, { estimatedKcal: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-transparent text-right tabular-nums border-b border-slate-200 dark:border-slate-600"
                      />
                      <span className="text-slate-500">kcal</span>
                      <span className="col-span-4 text-slate-500 tabular-nums text-right">
                        P{it.estimatedProteinG.toFixed(1)} F{it.estimatedFatG.toFixed(1)} C
                        {it.estimatedCarbG.toFixed(1)}
                      </span>
                    </div>
                    {it.notes && (
                      <div className="text-[10px] text-slate-500">📝 {it.notes}</div>
                    )}
                    <div className="text-[10px]">
                      {it.confidence === 'high' && (
                        <span className="text-emerald-600 dark:text-emerald-400">信頼度: 高</span>
                      )}
                      {it.confidence === 'medium' && (
                        <span className="text-amber-600 dark:text-amber-400">信頼度: 中</span>
                      )}
                      {it.confidence === 'low' && (
                        <span className="text-red-600 dark:text-red-400">信頼度: 低 (要確認)</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setItems([])
                setPreviewUrl(null)
              }}
              className="py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm"
            >
              撮り直し
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!items.some((i) => i.selected)}
              className="py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold disabled:opacity-50"
            >
              まとめて記録
            </button>
          </div>
        </>
      )}

      {!loading && items.length === 0 && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
        >
          キャンセル
        </button>
      )}
    </div>
  )
}
