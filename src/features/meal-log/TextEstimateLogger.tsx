import { useState } from 'react'
import { estimateFromText, type VisionItem } from '../../services/gemini'
import type { MealItem } from '../../lib/types'

interface TextEstimateLoggerProps {
  initialQuery?: string
  onItemsDetected: (items: MealItem[]) => void
  onCancel: () => void
}

interface EditableItem extends VisionItem {
  selected: boolean
}

function toMealItem(item: EditableItem): MealItem {
  return {
    foodId: `gemini-text:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    foodName: item.foodName,
    grams: item.estimatedGrams,
    nutrients: {
      kcal: item.estimatedKcal,
      protein_g: item.estimatedProteinG,
      fat_g: item.estimatedFatG,
      carb_g: item.estimatedCarbG,
    },
  }
}

const PRESET_QUERIES = [
  'ハンバーグ定食',
  'サバの味噌煮定食',
  'ラーメンと半チャーハン',
  'コンビニのサラダチキン',
  '豚汁',
  '家で作ったカレー',
]

export function TextEstimateLogger({ initialQuery = '', onItemsDetected, onCancel }: TextEstimateLoggerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [items, setItems] = useState<EditableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEstimate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setItems([])
    try {
      const detected = await estimateFromText(query.trim())
      setItems(detected.map((d) => ({ ...d, selected: true })))
    } catch (err) {
      setError(err instanceof Error ? err.message : '推定に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function updateItem(idx: number, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function handleConfirm() {
    onItemsDetected(items.filter((i) => i.selected).map(toMealItem))
  }

  const totalKcal = items.filter((i) => i.selected).reduce((acc, i) => acc + i.estimatedKcal, 0)

  return (
    <div className="space-y-3">
      <form onSubmit={handleEstimate} className="space-y-2">
        <label className="block">
          <span className="text-xs text-slate-600 dark:text-slate-300">料理名 / メニュー名</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: ハンバーグ定食、豚汁、コンビニの◯◯弁当..."
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-base"
            autoFocus
          />
        </label>

        {items.length === 0 && !loading && (
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuery(q)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-500"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold disabled:opacity-50"
        >
          {loading ? '🤖 AI推定中...' : '🤖 AIに聞く'}
        </button>
      </form>

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
                    <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1 items-center text-xs">
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
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      P{it.estimatedProteinG.toFixed(1)}g · F{it.estimatedFatG.toFixed(1)}g · C{it.estimatedCarbG.toFixed(1)}g
                    </div>
                    {it.notes && <div className="text-[10px] text-slate-500">📝 {it.notes}</div>}
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
                setError(null)
              }}
              className="py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm"
            >
              やり直し
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

      {items.length === 0 && (
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
