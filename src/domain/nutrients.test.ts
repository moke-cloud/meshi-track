import { describe, it, expect } from 'vitest'
import { scaleNutrients, sumNutrients, emptyNutrients } from './nutrients'
import type { NutrientsPer100g } from '../lib/types'

const chickenBreast: NutrientsPer100g = {
  kcal: 108,
  protein_g: 22.3,
  fat_g: 1.5,
  carb_g: 0,
  salt_g: 0.1,
  iron_mg: 0.3,
  vitamin_b6_mg: 0.57,
}

const rice: NutrientsPer100g = {
  kcal: 156,
  protein_g: 2.5,
  fat_g: 0.3,
  carb_g: 37.1,
  fiber_g: 1.5,
}

describe('scaleNutrients', () => {
  it('scales per100g values to grams linearly', () => {
    const scaled = scaleNutrients(chickenBreast, 200)
    expect(scaled.kcal).toBeCloseTo(216, 1)
    expect(scaled.protein_g).toBeCloseTo(44.6, 1)
    expect(scaled.fat_g).toBeCloseTo(3.0, 1)
  })

  it('returns 0 for 0g', () => {
    const scaled = scaleNutrients(chickenBreast, 0)
    expect(scaled.kcal).toBe(0)
    expect(scaled.protein_g).toBe(0)
  })

  it('preserves optional fields when defined', () => {
    const scaled = scaleNutrients(chickenBreast, 100)
    expect(scaled.salt_g).toBeCloseTo(0.1, 2)
    expect(scaled.vitamin_b6_mg).toBeCloseTo(0.57, 2)
  })

  it('does not introduce fields that are absent in source', () => {
    const scaled = scaleNutrients(rice, 150)
    expect(scaled.salt_g).toBeUndefined()
    expect(scaled.vitamin_b6_mg).toBeUndefined()
  })

  it('throws for negative grams', () => {
    expect(() => scaleNutrients(chickenBreast, -10)).toThrow()
  })
})

describe('sumNutrients', () => {
  it('returns emptyNutrients() for an empty array', () => {
    expect(sumNutrients([])).toEqual(emptyNutrients())
  })

  it('adds required fields', () => {
    const a: NutrientsPer100g = { kcal: 100, protein_g: 10, fat_g: 5, carb_g: 20 }
    const b: NutrientsPer100g = { kcal: 200, protein_g: 15, fat_g: 2, carb_g: 30 }
    const total = sumNutrients([a, b])
    expect(total.kcal).toBe(300)
    expect(total.protein_g).toBe(25)
    expect(total.fat_g).toBe(7)
    expect(total.carb_g).toBe(50)
  })

  it('adds optional fields treating undefined as 0', () => {
    const a: NutrientsPer100g = { kcal: 100, protein_g: 10, fat_g: 5, carb_g: 20, iron_mg: 2 }
    const b: NutrientsPer100g = { kcal: 100, protein_g: 10, fat_g: 5, carb_g: 20 } // iron_mg undefined
    const total = sumNutrients([a, b])
    expect(total.iron_mg).toBe(2)
  })

  it('returns 0 for an optional field when all inputs omit it', () => {
    const a: NutrientsPer100g = { kcal: 100, protein_g: 10, fat_g: 5, carb_g: 20 }
    const b: NutrientsPer100g = { kcal: 200, protein_g: 15, fat_g: 2, carb_g: 30 }
    const total = sumNutrients([a, b])
    // iron_mg はどちらも未設定なので 0 として集計
    expect(total.iron_mg).toBe(0)
  })
})

describe('emptyNutrients', () => {
  it('returns zero for required fields', () => {
    const e = emptyNutrients()
    expect(e.kcal).toBe(0)
    expect(e.protein_g).toBe(0)
    expect(e.fat_g).toBe(0)
    expect(e.carb_g).toBe(0)
  })

  it('initializes optional fields to 0 (not undefined) for easy downstream access', () => {
    const e = emptyNutrients()
    expect(e.iron_mg).toBe(0)
    expect(e.vitamin_c_mg).toBe(0)
    expect(e.fiber_g).toBe(0)
  })
})
