import { useState } from 'react'
import type { FoodRecord } from '../../lib/types'
import { scaleNutrients } from '../../domain/nutrients'

interface GramsInputProps {
  food: FoodRecord
  onConfirm: (grams: number) => void
  onCancel: () => void
}

const QUICK_GRAMS = [50, 100, 150, 200, 250]

export function GramsInput({ food, onConfirm, onCancel }: GramsInputProps) {
  const [grams, setGrams] = useState<number>(100)
  const scaled = scaleNutrients(food.nutrients, grams)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-4">
        <div className="text-sm font-medium">{food.name}</div>
        {food.category && <div className="text-xs text-slate-500">{food.category}</div>}
      </div>

      <label className="block">
        <span className="text-sm text-slate-600 dark:text-slate-300">量 (g)</span>
        <input
          type="number"
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(Math.max(0, Number(e.target.value)))}
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-2xl font-semibold tabular-nums text-center"
          min={0}
          step={10}
          autoFocus
        />
      </label>

      <div className="grid grid-cols-5 gap-1">
        {QUICK_GRAMS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrams(g)}
            className={`py-2 rounded-lg border text-sm ${
              grams === g
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {g}g
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
        <div className="text-xs text-emerald-800 dark:text-emerald-300 mb-1">この量の栄養素</div>
        <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">
          {Math.round(scaled.kcal)}
          <span className="text-sm font-normal ml-1">kcal</span>
        </div>
        <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
          P {scaled.protein_g.toFixed(1)}g / F {scaled.fat_g.toFixed(1)}g / C {scaled.carb_g.toFixed(1)}g
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="py-3 rounded-xl border border-slate-300 dark:border-slate-600"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => onConfirm(grams)}
          disabled={grams <= 0}
          className="py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold disabled:opacity-50"
        >
          記録する
        </button>
      </div>
    </div>
  )
}
