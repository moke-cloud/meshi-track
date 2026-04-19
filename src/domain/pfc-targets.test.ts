import { describe, it, expect } from 'vitest'
import { calculatePfcTargetsG, evaluateMacros, suggestFoodsFor } from './pfc'
import type { UserProfile, NutrientsPer100g } from '../lib/types'

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'me',
  heightCm: 170,
  weightKg: 65,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
  goal: 'maintain',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('calculatePfcTargetsG', () => {
  it('maintain + moderate: P = 1.2 g/kg', () => {
    const t = calculatePfcTargetsG(profile({ goal: 'maintain', activityLevel: 'moderate' }), 2400)
    expect(t.protein_g).toBeCloseTo(65 * 1.2, 1)
    expect(t.fat_g).toBeCloseTo((2400 * 0.25) / 9, 1)
    expect(t.carb_g).toBeCloseTo((2400 * 0.55) / 4, 1)
  })

  it('lose: P = 1.5 g/kg (高め、筋量保護)', () => {
    const t = calculatePfcTargetsG(profile({ goal: 'lose' }), 2000)
    expect(t.protein_g).toBeCloseTo(65 * 1.5, 1)
  })

  it('gain: P = 1.6 g/kg', () => {
    const t = calculatePfcTargetsG(profile({ goal: 'gain' }), 2800)
    expect(t.protein_g).toBeCloseTo(65 * 1.6, 1)
  })

  it('active は +0.2 g/kg のボーナス', () => {
    const base = calculatePfcTargetsG(profile({ goal: 'maintain', activityLevel: 'moderate' }), 2400)
    const active = calculatePfcTargetsG(profile({ goal: 'maintain', activityLevel: 'active' }), 2400)
    expect(active.protein_g - base.protein_g).toBeCloseTo(65 * 0.2, 1)
  })
})

describe('evaluateMacros', () => {
  const targets = { protein_g: 80, fat_g: 67, carb_g: 330 }

  it('80%未満は deficit', () => {
    const consumed: NutrientsPer100g = { kcal: 0, protein_g: 50, fat_g: 30, carb_g: 200 }
    const reports = evaluateMacros(consumed, targets)
    expect(reports.find((r) => r.key === 'protein')?.status).toBe('deficit')
    expect(reports.find((r) => r.key === 'fat')?.status).toBe('deficit')
  })

  it('80〜120%は ok', () => {
    const consumed: NutrientsPer100g = { kcal: 0, protein_g: 80, fat_g: 67, carb_g: 330 }
    const reports = evaluateMacros(consumed, targets)
    expect(reports.every((r) => r.status === 'ok')).toBe(true)
  })

  it('120%超は excess', () => {
    const consumed: NutrientsPer100g = { kcal: 0, protein_g: 120, fat_g: 100, carb_g: 500 }
    const reports = evaluateMacros(consumed, targets)
    expect(reports.every((r) => r.status === 'excess')).toBe(true)
  })

  it('gapG は不足なら正、過剰なら負', () => {
    const consumed: NutrientsPer100g = { kcal: 0, protein_g: 50, fat_g: 100, carb_g: 330 }
    const reports = evaluateMacros(consumed, targets)
    expect(reports.find((r) => r.key === 'protein')!.gapG).toBe(30) // 80-50
    expect(reports.find((r) => r.key === 'fat')!.gapG).toBe(-33) // 67-100
  })
})

describe('suggestFoodsFor', () => {
  it('タンパク質不足に鶏むね等を提案', () => {
    const hints = suggestFoodsFor('protein', 30)
    expect(hints.length).toBeGreaterThan(0)
    expect(hints[0].name).toContain('鶏むね')
    // 30g のタンパク質を補うには 鶏むね(23.3g/100g) で ~129g
    expect(hints[0].suggestedGrams).toBeGreaterThan(100)
    expect(hints[0].suggestedGrams).toBeLessThan(200)
  })

  it('不足なし(gap<=0)なら空配列', () => {
    expect(suggestFoodsFor('protein', 0)).toEqual([])
    expect(suggestFoodsFor('protein', -5)).toEqual([])
  })

  it('極端に大量 or 微量の提案は除外', () => {
    // 1g しか足りない → どの食品でも 10g 未満になるので除外される可能性大
    const hints = suggestFoodsFor('fat', 0.5)
    for (const h of hints) {
      expect(h.suggestedGrams).toBeGreaterThanOrEqual(10)
      expect(h.suggestedGrams).toBeLessThanOrEqual(500)
    }
  })
})
