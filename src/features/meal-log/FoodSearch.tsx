import { useEffect, useMemo, useState } from 'react'
import { searchFoodsByName } from '../../lib/db'
import type { FoodRecord } from '../../lib/types'

interface FoodSearchProps {
  onSelect: (food: FoodRecord) => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(h)
  }, [value, delay])
  return debounced
}

export function FoodSearch({ onSelect }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodRecord[]>([])
  const [loading, setLoading] = useState(false)
  const debounced = useDebounce(query, 200)

  useEffect(() => {
    let cancelled = false
    if (!debounced.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    searchFoodsByName(debounced, 50)
      .then((r) => {
        if (!cancelled) setResults(r)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of results) if (r.category) set.add(r.category)
    return Array.from(set).sort()
  }, [results])

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const filtered = useMemo(
    () => (activeCategory ? results.filter((r) => r.category === activeCategory) : results),
    [results, activeCategory],
  )

  return (
    <div className="space-y-3">
      <label className="block">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="食品名で検索 (例: 鶏むね / ごはん)"
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-4 py-3 text-base"
          autoFocus
        />
      </label>

      {categories.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
              activeCategory === null
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            すべて
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
                activeCategory === c
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 min-h-20">
        {loading && <div className="p-4 text-sm text-slate-500 text-center">検索中...</div>}
        {!loading && debounced && filtered.length === 0 && (
          <div className="p-4 text-sm text-slate-500 text-center">一致する食品がありません</div>
        )}
        {!debounced && !loading && (
          <div className="p-4 text-sm text-slate-400 text-center">食品名またはよみを入力してください</div>
        )}
        {filtered.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f)}
            className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <div className="text-sm font-medium">{f.name}</div>
            <div className="text-xs text-slate-500 tabular-nums">
              {f.category && <span className="mr-2">[{f.category}]</span>}
              100g: {Math.round(f.nutrients.kcal)} kcal / P{f.nutrients.protein_g.toFixed(1)}g
              / F{f.nutrients.fat_g.toFixed(1)}g / C{f.nutrients.carb_g.toFixed(1)}g
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
