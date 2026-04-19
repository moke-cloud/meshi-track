import type { NutrientsPer100g } from '../lib/types'

/**
 * 栄養素レコードの「必須キー」。これらは常に数値として存在する。
 * optionalキー (fiber_g, salt_g, 微量栄養素など) は型定義側で undefined 許容。
 */
const REQUIRED_KEYS = ['kcal', 'protein_g', 'fat_g', 'carb_g'] as const

/**
 * NutrientsPer100g の全キー。集計・スケーリングで走査する。
 * 型定義 (lib/types.ts) にキーを追加したら必ずここにも追加すること。
 */
const ALL_KEYS = [
  'kcal',
  'protein_g',
  'fat_g',
  'carb_g',
  'fiber_g',
  'salt_g',
  'calcium_mg',
  'iron_mg',
  'potassium_mg',
  'magnesium_mg',
  'zinc_mg',
  'vitamin_a_ug',
  'vitamin_d_ug',
  'vitamin_e_mg',
  'vitamin_k_ug',
  'vitamin_b1_mg',
  'vitamin_b2_mg',
  'niacin_mg',
  'vitamin_b6_mg',
  'vitamin_b12_ug',
  'folate_ug',
  'vitamin_c_mg',
] as const satisfies readonly (keyof NutrientsPer100g)[]

export function emptyNutrients(): NutrientsPer100g {
  const zero: Record<string, number> = {}
  for (const key of ALL_KEYS) {
    zero[key] = 0
  }
  return zero as unknown as NutrientsPer100g
}

/**
 * 「servingSize 個の単位あたり」の栄養素を実摂取量にスケーリング。
 *
 *   nutrients × amount / servingSize
 *
 * デフォルトの servingSize=100 により、従来の「per 100g × grams」呼び出しは
 * そのまま動作する (後方互換)。サプリ等で per 1粒 の栄養素なら servingSize=1 を指定。
 */
export function scaleNutrients(
  nutrientsPerServing: Readonly<NutrientsPer100g>,
  amount: number,
  servingSize = 100,
): NutrientsPer100g {
  if (amount < 0 || !Number.isFinite(amount)) {
    throw new Error(`scaleNutrients: amount must be non-negative finite number, got ${amount}`)
  }
  if (servingSize <= 0 || !Number.isFinite(servingSize)) {
    throw new Error(`scaleNutrients: servingSize must be positive finite number, got ${servingSize}`)
  }
  const factor = amount / servingSize
  const result: Record<string, number> = {}
  for (const key of ALL_KEYS) {
    const v = nutrientsPerServing[key]
    if (v === undefined) continue
    result[key] = v * factor
  }
  for (const key of REQUIRED_KEYS) {
    if (result[key] === undefined) result[key] = 0
  }
  return result as unknown as NutrientsPer100g
}

/**
 * 栄養素レコードの配列を合算する。
 * 各 optional フィールドは「1つでも定義されていれば結果も定義、全員undefinedなら0として集計」。
 * (全員undefinedで結果 undefined にすると合算ロジックで `a + undefined` を扱う必要が出るため、
 *  実用上は「未計測のものは0扱い」で十分。過大評価ではなく過小評価側に倒れるだけ)
 */
export function sumNutrients(items: readonly Readonly<NutrientsPer100g>[]): NutrientsPer100g {
  const total: Record<string, number> = {
    kcal: 0,
    protein_g: 0,
    fat_g: 0,
    carb_g: 0,
  }
  for (const item of items) {
    for (const key of ALL_KEYS) {
      const v = item[key]
      if (v === undefined) continue
      total[key] = (total[key] ?? 0) + v
    }
  }
  // optional キーが最後まで登場しなかった場合も 0 で初期化
  for (const key of ALL_KEYS) {
    if (total[key] === undefined) total[key] = 0
  }
  return total as unknown as NutrientsPer100g
}
