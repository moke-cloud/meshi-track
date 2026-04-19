import { useState } from 'react'
import type { FoodRecord } from '../../lib/types'
import { scaleNutrients } from '../../domain/nutrients'

interface GramsInputProps {
  food: FoodRecord
  onConfirm: (amount: number) => void
  onCancel: () => void
}

/**
 * 食品のservingUnitに応じたクイック量プリセットを返す。
 */
function quickAmountsFor(unit: string, servingSize: number): number[] {
  // サプリ (粒/カプセル) は 1/2/3 タブレット
  if (unit === '粒' || unit === 'カプセル') return [1, 2, 3]
  // ml は 100/200/350/500
  if (unit === 'ml') return [100, 200, 350, 500]
  // scoop/杯 は 1/2
  if (unit === 'スクープ' || unit === '杯') return [1, 2]
  // g (標準) は servingSize に応じて
  if (servingSize >= 100) return [50, 100, 150, 200, 250]
  return [servingSize, servingSize * 2, servingSize * 3]
}

export function GramsInput({ food, onConfirm, onCancel }: GramsInputProps) {
  const servingUnit = food.servingUnit ?? 'g'
  const servingSize = food.servingSize ?? 100
  const defaultAmount = food.defaultAmount ?? (servingUnit === 'g' ? 100 : 1)
  const [amount, setAmount] = useState<number>(defaultAmount)
  const scaled = scaleNutrients(food.nutrients, amount, servingSize)
  const quickAmounts = quickAmountsFor(servingUnit, servingSize)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-4">
        <div className="text-sm font-medium">{food.name}</div>
        {food.category && <div className="text-xs text-slate-500">{food.category}</div>}
        <div className="text-[10px] text-slate-400 mt-1">
          栄養素表示単位: {servingSize}{servingUnit}あたり
        </div>
      </div>

      <label className="block">
        <span className="text-sm text-slate-600 dark:text-slate-300">量 ({servingUnit})</span>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-2xl font-semibold tabular-nums text-center"
          min={0}
          step={servingUnit === 'g' || servingUnit === 'ml' ? 10 : 1}
          autoFocus
        />
      </label>

      <div className={`grid gap-1 ${quickAmounts.length >= 5 ? 'grid-cols-5' : 'grid-cols-' + quickAmounts.length}`}>
        {quickAmounts.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setAmount(g)}
            className={`py-2 rounded-lg border text-sm ${
              amount === g
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {g}{servingUnit}
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
          onClick={() => onConfirm(amount)}
          disabled={amount <= 0}
          className="py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold disabled:opacity-50"
        >
          記録する
        </button>
      </div>
    </div>
  )
}
