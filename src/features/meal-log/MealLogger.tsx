import { useState } from 'react'
import { FoodSearch } from './FoodSearch'
import { GramsInput } from './GramsInput'
import type { FoodRecord, MealRecord, MealType } from '../../lib/types'
import { putMeal } from '../../lib/db'
import { inferMealType, MEAL_TYPE_LABELS, toLocalDateString } from '../../lib/datetime'
import { scaleNutrients } from '../../domain/nutrients'
import { newId } from '../../lib/ulid'

interface MealLoggerProps {
  onClose: () => void
  onSaved: () => void
}

type Step = 'search' | 'grams'

export function MealLogger({ onClose, onSaved }: MealLoggerProps) {
  const [mealType, setMealType] = useState<MealType>(inferMealType())
  const [step, setStep] = useState<Step>('search')
  const [selectedFood, setSelectedFood] = useState<FoodRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(grams: number) {
    if (!selectedFood) return
    setSaving(true)
    setError(null)
    try {
      const nutrients = scaleNutrients(selectedFood.nutrients, grams)
      const now = new Date()
      const meal: MealRecord = {
        id: newId('meal'),
        date: toLocalDateString(now),
        mealType,
        loggedAt: now.toISOString(),
        items: [
          {
            foodId: selectedFood.id,
            foodName: selectedFood.name,
            grams,
            nutrients,
          },
        ],
      }
      await putMeal(meal)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-slate-50 dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">食事を記録</h2>
            <div className="text-xs text-slate-500">{MEAL_TYPE_LABELS[mealType]}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-1">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMealType(t)}
                className={`py-2 rounded-lg border text-xs ${
                  mealType === t
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {MEAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {step === 'search' && (
            <FoodSearch
              onSelect={(f) => {
                setSelectedFood(f)
                setStep('grams')
              }}
            />
          )}
          {step === 'grams' && selectedFood && (
            <GramsInput
              food={selectedFood}
              onConfirm={handleConfirm}
              onCancel={() => {
                setSelectedFood(null)
                setStep('search')
              }}
            />
          )}

          {saving && <div className="text-sm text-slate-500 text-center">保存中...</div>}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
