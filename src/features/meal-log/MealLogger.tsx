import { useState } from 'react'
import { FoodSearch } from './FoodSearch'
import { GramsInput } from './GramsInput'
import { BarcodeScanner } from './BarcodeScanner'
import { PhotoLogger } from './PhotoLogger'
import type { FoodRecord, MealItem, MealRecord, MealType } from '../../lib/types'
import { putFood, putMeal } from '../../lib/db'
import { inferMealType, MEAL_TYPE_LABELS, toLocalDateString } from '../../lib/datetime'
import { scaleNutrients } from '../../domain/nutrients'
import { newId } from '../../lib/ulid'
import { lookupBarcode } from '../../services/openFoodFacts'

interface MealLoggerProps {
  onClose: () => void
  onSaved: () => void
}

type Mode = 'menu' | 'photo' | 'barcode' | 'search' | 'grams' | 'barcode-lookup'

export function MealLogger({ onClose, onSaved }: MealLoggerProps) {
  const [mealType, setMealType] = useState<MealType>(inferMealType())
  const [mode, setMode] = useState<Mode>('menu')
  const [selectedFood, setSelectedFood] = useState<FoodRecord | null>(null)
  const [items, setItems] = useState<MealItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null)

  function addItem(item: MealItem) {
    setItems((prev) => [...prev, item])
    setMode('menu')
    setSelectedFood(null)
  }

  function handleGramsConfirm(grams: number) {
    if (!selectedFood) return
    addItem({
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      grams,
      nutrients: scaleNutrients(selectedFood.nutrients, grams),
    })
  }

  async function handleBarcodeDetected(barcode: string) {
    setMode('barcode-lookup')
    setError(null)
    setBarcodeMessage(`JAN: ${barcode} を検索中...`)
    try {
      const food = await lookupBarcode(barcode)
      if (!food) {
        setBarcodeMessage(`JAN ${barcode} は Open Food Facts に登録がありません。検索で手動登録してください。`)
        setTimeout(() => {
          setMode('search')
          setBarcodeMessage(null)
        }, 2500)
        return
      }
      // OFF商品をローカル foods テーブルに記録 (次回から検索可能)
      await putFood(food)
      setSelectedFood(food)
      setMode('grams')
      setBarcodeMessage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'バーコード検索失敗')
      setMode('menu')
      setBarcodeMessage(null)
    }
  }

  async function handleSaveMeal() {
    if (items.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const now = new Date()
      const meal: MealRecord = {
        id: newId('meal'),
        date: toLocalDateString(now),
        mealType,
        loggedAt: now.toISOString(),
        items,
      }
      await putMeal(meal)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const totalKcal = items.reduce((acc, i) => acc + i.nutrients.kcal, 0)

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-slate-50 dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto safe-mb">
        <div className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold">食事を記録</h2>
            <div className="text-xs text-slate-500">
              {MEAL_TYPE_LABELS[mealType]} · {items.length}品 · {Math.round(totalKcal)} kcal
            </div>
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

          {items.length > 0 && (
            <section className="rounded-xl bg-white dark:bg-slate-800 p-3 space-y-1">
              <div className="text-xs text-slate-500 mb-1">追加済み</div>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate flex-1">{it.foodName}</span>
                  <span className="text-xs text-slate-500 tabular-nums ml-2">
                    {it.grams}g · {Math.round(it.nutrients.kcal)}kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="ml-2 text-red-500 text-xs"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </section>
          )}

          {mode === 'menu' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode('photo')}
                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-base"
              >
                📷 写真で記録 (AI認識)
              </button>
              <button
                type="button"
                onClick={() => setMode('barcode')}
                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-base"
              >
                🏷 バーコードスキャン
              </button>
              <button
                type="button"
                onClick={() => setMode('search')}
                className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm"
              >
                🔍 食品名で検索
              </button>
            </div>
          )}

          {mode === 'photo' && (
            <PhotoLogger
              onItemsDetected={(newItems) => {
                setItems((prev) => [...prev, ...newItems])
                setMode('menu')
              }}
              onCancel={() => setMode('menu')}
            />
          )}

          {mode === 'barcode' && (
            <BarcodeScanner
              onDetected={(b) => void handleBarcodeDetected(b)}
              onCancel={() => setMode('menu')}
            />
          )}

          {mode === 'barcode-lookup' && barcodeMessage && (
            <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-4 text-sm text-center">
              {barcodeMessage}
            </div>
          )}

          {mode === 'search' && (
            <>
              <FoodSearch
                onSelect={(f) => {
                  setSelectedFood(f)
                  setMode('grams')
                }}
              />
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
              >
                戻る
              </button>
            </>
          )}

          {mode === 'grams' && selectedFood && (
            <GramsInput
              food={selectedFood}
              onConfirm={handleGramsConfirm}
              onCancel={() => {
                setSelectedFood(null)
                setMode('menu')
              }}
            />
          )}

          {items.length > 0 && mode === 'menu' && (
            <button
              type="button"
              onClick={handleSaveMeal}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {saving ? '保存中...' : `この食事を記録 (${items.length}品 ${Math.round(totalKcal)}kcal)`}
            </button>
          )}

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
