import type { MealType } from './types'

/** ローカル時刻で YYYY-MM-DD 形式の日付文字列を返す */
export function toLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 時刻から食事タイプを推定。
 *   4〜10時: breakfast
 *   11〜14時: lunch
 *   17〜21時: dinner
 *   その他: snack
 */
export function inferMealType(d: Date = new Date()): MealType {
  const h = d.getHours()
  if (h >= 4 && h <= 10) return 'breakfast'
  if (h >= 11 && h <= 14) return 'lunch'
  if (h >= 17 && h <= 21) return 'dinner'
  return 'snack'
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
}
