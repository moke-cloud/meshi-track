import type { NutrientsPer100g } from '../lib/types'

/** Atwater 係数 (kcal/g) */
const KCAL_PER_GRAM = {
  protein: 4,
  fat: 9,
  carb: 4,
} as const

export interface PfcKcalBreakdown {
  p_kcal: number
  f_kcal: number
  c_kcal: number
}

export interface PfcRatios {
  p_ratio: number
  f_ratio: number
  c_ratio: number
}

export function pfcKcalBreakdown(n: Readonly<NutrientsPer100g>): PfcKcalBreakdown {
  return {
    p_kcal: n.protein_g * KCAL_PER_GRAM.protein,
    f_kcal: n.fat_g * KCAL_PER_GRAM.fat,
    c_kcal: n.carb_g * KCAL_PER_GRAM.carb,
  }
}

export function calculatePfcRatios(n: Readonly<NutrientsPer100g>): PfcRatios {
  const { p_kcal, f_kcal, c_kcal } = pfcKcalBreakdown(n)
  const total = p_kcal + f_kcal + c_kcal
  if (total === 0) {
    return { p_ratio: 0, f_ratio: 0, c_ratio: 0 }
  }
  return {
    p_ratio: p_kcal / total,
    f_ratio: f_kcal / total,
    c_ratio: c_kcal / total,
  }
}
