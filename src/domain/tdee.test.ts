import { describe, it, expect } from 'vitest'
import { calculateBmr, calculateTdee, calculateTargetCalories, getActivityFactor } from './tdee'
import type { UserProfile } from '../lib/types'

const baseProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
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

describe('calculateBmr (Mifflin-St Jeor)', () => {
  // Mifflin-St Jeor 公式:
  //   男性: BMR = 10W + 6.25H - 5A + 5
  //   女性: BMR = 10W + 6.25H - 5A - 161

  it('computes BMR for a 30yo male, 170cm, 65kg', () => {
    // 10*65 + 6.25*170 - 5*30 + 5 = 650 + 1062.5 - 150 + 5 = 1567.5
    const profile = baseProfile({ sex: 'male', age: 30, heightCm: 170, weightKg: 65 })
    expect(calculateBmr(profile)).toBeCloseTo(1567.5, 1)
  })

  it('computes BMR for a 25yo female, 160cm, 55kg', () => {
    // 10*55 + 6.25*160 - 5*25 - 161 = 550 + 1000 - 125 - 161 = 1264
    const profile = baseProfile({ sex: 'female', age: 25, heightCm: 160, weightKg: 55 })
    expect(calculateBmr(profile)).toBeCloseTo(1264, 1)
  })

  it('is always positive for realistic inputs', () => {
    const profile = baseProfile({ sex: 'male', age: 80, heightCm: 150, weightKg: 45 })
    expect(calculateBmr(profile)).toBeGreaterThan(0)
  })
})

describe('getActivityFactor', () => {
  it('returns documented factors for each level', () => {
    expect(getActivityFactor('sedentary')).toBe(1.2)
    expect(getActivityFactor('light')).toBe(1.375)
    expect(getActivityFactor('moderate')).toBe(1.55)
    expect(getActivityFactor('active')).toBe(1.725)
    expect(getActivityFactor('very_active')).toBe(1.9)
  })
})

describe('calculateTdee', () => {
  it('equals BMR * activity factor', () => {
    const profile = baseProfile({ sex: 'male', age: 30, heightCm: 170, weightKg: 65, activityLevel: 'moderate' })
    // BMR 1567.5 * 1.55 = 2429.625
    expect(calculateTdee(profile)).toBeCloseTo(2429.625, 1)
  })

  it('scales with activity level', () => {
    const sedentary = calculateTdee(baseProfile({ activityLevel: 'sedentary' }))
    const veryActive = calculateTdee(baseProfile({ activityLevel: 'very_active' }))
    expect(veryActive).toBeGreaterThan(sedentary)
  })
})

describe('calculateTargetCalories', () => {
  // 目標:
  //   減量 (lose): TDEE - 500 (週約0.5kg減)
  //   維持 (maintain): TDEE
  //   増量 (gain): TDEE + 300

  it('subtracts 500 for lose', () => {
    const profile = baseProfile({ goal: 'lose' })
    const tdee = calculateTdee(profile)
    expect(calculateTargetCalories(profile)).toBeCloseTo(tdee - 500, 1)
  })

  it('equals TDEE for maintain', () => {
    const profile = baseProfile({ goal: 'maintain' })
    expect(calculateTargetCalories(profile)).toBeCloseTo(calculateTdee(profile), 1)
  })

  it('adds 300 for gain', () => {
    const profile = baseProfile({ goal: 'gain' })
    const tdee = calculateTdee(profile)
    expect(calculateTargetCalories(profile)).toBeCloseTo(tdee + 300, 1)
  })

  it('never returns below a safe floor (1200 kcal)', () => {
    // 極端に小柄でも減量時に 1200 kcal を下回らない安全下限
    const profile = baseProfile({ sex: 'female', age: 70, heightCm: 145, weightKg: 38, activityLevel: 'sedentary', goal: 'lose' })
    expect(calculateTargetCalories(profile)).toBeGreaterThanOrEqual(1200)
  })
})
