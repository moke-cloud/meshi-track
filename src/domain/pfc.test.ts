import { describe, it, expect } from 'vitest'
import { calculatePfcRatios, pfcKcalBreakdown } from './pfc'
import type { NutrientsPer100g } from '../lib/types'

describe('pfcKcalBreakdown', () => {
  // Atwater係数: P=4 kcal/g, F=9 kcal/g, C=4 kcal/g

  it('computes kcal per macronutrient via Atwater factors', () => {
    const n: NutrientsPer100g = { kcal: 0, protein_g: 20, fat_g: 10, carb_g: 50 }
    const { p_kcal, f_kcal, c_kcal } = pfcKcalBreakdown(n)
    expect(p_kcal).toBeCloseTo(80, 1)
    expect(f_kcal).toBeCloseTo(90, 1)
    expect(c_kcal).toBeCloseTo(200, 1)
  })

  it('returns zeros for a zeroed nutrients record', () => {
    const n: NutrientsPer100g = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0 }
    const { p_kcal, f_kcal, c_kcal } = pfcKcalBreakdown(n)
    expect(p_kcal).toBe(0)
    expect(f_kcal).toBe(0)
    expect(c_kcal).toBe(0)
  })
})

describe('calculatePfcRatios', () => {
  it('returns proportions summing to ~1 when macros exist', () => {
    const n: NutrientsPer100g = { kcal: 0, protein_g: 20, fat_g: 10, carb_g: 50 }
    // P 80 / F 90 / C 200 = total 370
    const { p_ratio, f_ratio, c_ratio } = calculatePfcRatios(n)
    expect(p_ratio + f_ratio + c_ratio).toBeCloseTo(1, 3)
    expect(p_ratio).toBeCloseTo(80 / 370, 3)
    expect(f_ratio).toBeCloseTo(90 / 370, 3)
    expect(c_ratio).toBeCloseTo(200 / 370, 3)
  })

  it('returns all zeros when all macros are zero (no division by zero)', () => {
    const n: NutrientsPer100g = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0 }
    const { p_ratio, f_ratio, c_ratio } = calculatePfcRatios(n)
    expect(p_ratio).toBe(0)
    expect(f_ratio).toBe(0)
    expect(c_ratio).toBe(0)
  })
})
