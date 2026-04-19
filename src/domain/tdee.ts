import type { ActivityLevel, UserProfile } from '../lib/types'

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_KCAL_DELTA = {
  lose: -500,
  maintain: 0,
  gain: 300,
} as const

/** 極端な減量設定でも下回らない安全下限 (kcal) */
const SAFETY_FLOOR_KCAL = 1200

export function getActivityFactor(level: ActivityLevel): number {
  return ACTIVITY_FACTORS[level]
}

/**
 * 基礎代謝量 (BMR) を Mifflin-St Jeor 式で算出。
 *   男性: 10W + 6.25H - 5A + 5
 *   女性: 10W + 6.25H - 5A - 161
 */
export function calculateBmr(profile: Readonly<UserProfile>): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return profile.sex === 'male' ? base + 5 : base - 161
}

/**
 * 総消費カロリー (TDEE) = BMR × 活動係数。
 */
export function calculateTdee(profile: Readonly<UserProfile>): number {
  return calculateBmr(profile) * getActivityFactor(profile.activityLevel)
}

/**
 * 目標摂取カロリー = TDEE + 目標別補正。
 * 小柄な女性の減量などで低すぎる値になるのを防ぐため 1200 kcal を下限とする。
 */
export function calculateTargetCalories(profile: Readonly<UserProfile>): number {
  const tdee = calculateTdee(profile)
  const raw = tdee + GOAL_KCAL_DELTA[profile.goal]
  return Math.max(raw, SAFETY_FLOOR_KCAL)
}
