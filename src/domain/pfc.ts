import type { GoalType, NutrientsPer100g, UserProfile } from '../lib/types'

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

export interface PfcTargetsG {
  protein_g: number
  fat_g: number
  carb_g: number
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

/**
 * 個人の目標PFC (グラム) を算出。
 *
 * タンパク質: 体重ベース (厚労省 2025年版 食事摂取基準 + スポーツ栄養ガイドライン)
 *   - 維持: 1.2 g/kg
 *   - 減量: 1.5 g/kg (筋量保護のため高め)
 *   - 増量: 1.6 g/kg
 *   - 活動量が高い (active/very_active) 場合は +0.2 g/kg
 *
 * 脂質: 目標摂取カロリーの 25% (推奨比率 20-30% の中央値)
 * 炭水化物: 目標摂取カロリーの 55% (推奨比率 50-65% の中央値)
 */
const GOAL_PROTEIN_BASE: Record<GoalType, number> = {
  lose: 1.5,
  maintain: 1.2,
  gain: 1.6,
}

export function calculatePfcTargetsG(
  profile: Readonly<UserProfile>,
  targetKcal: number,
): PfcTargetsG {
  const perKg = GOAL_PROTEIN_BASE[profile.goal]
  const activityBonus =
    profile.activityLevel === 'active' || profile.activityLevel === 'very_active' ? 0.2 : 0
  const proteinG = profile.weightKg * (perKg + activityBonus)
  const fatG = (targetKcal * 0.25) / KCAL_PER_GRAM.fat
  const carbG = (targetKcal * 0.55) / KCAL_PER_GRAM.carb
  return { protein_g: proteinG, fat_g: fatG, carb_g: carbG }
}

export type MacroStatus = 'deficit' | 'ok' | 'excess'
export interface MacroReport {
  key: 'protein' | 'fat' | 'carb'
  label: string
  currentG: number
  targetG: number
  status: MacroStatus
  gapG: number // +: 不足 (あといくら必要)、-: 過剰 (いくらオーバー)
}

/** 現在摂取 × 目標 から各マクロのステータスを判定。 */
export function evaluateMacros(
  consumed: Readonly<NutrientsPer100g>,
  targets: Readonly<PfcTargetsG>,
): MacroReport[] {
  function classify(current: number, target: number): MacroStatus {
    const ratio = target > 0 ? current / target : 0
    if (ratio < 0.8) return 'deficit'
    if (ratio > 1.2) return 'excess'
    return 'ok'
  }
  return [
    {
      key: 'protein',
      label: 'タンパク質',
      currentG: consumed.protein_g,
      targetG: targets.protein_g,
      status: classify(consumed.protein_g, targets.protein_g),
      gapG: targets.protein_g - consumed.protein_g,
    },
    {
      key: 'fat',
      label: '脂質',
      currentG: consumed.fat_g,
      targetG: targets.fat_g,
      status: classify(consumed.fat_g, targets.fat_g),
      gapG: targets.fat_g - consumed.fat_g,
    },
    {
      key: 'carb',
      label: '炭水化物',
      currentG: consumed.carb_g,
      targetG: targets.carb_g,
      status: classify(consumed.carb_g, targets.carb_g),
      gapG: targets.carb_g - consumed.carb_g,
    },
  ]
}

/**
 * 不足しているマクロに対して、それを効率よく補充できる食品の
 * おすすめ例を生成する (ヒント用、あくまで概算)。
 *
 * 算出式: 必要グラム数 = gap / (食品100gあたりの該当マクロ割合 / 100)
 */
interface FoodHint {
  name: string
  macroPer100g: number // 対象マクロの g (per 100g)
  kcalPer100g: number
}

const PROTEIN_HINTS: FoodHint[] = [
  { name: '鶏むね肉(皮なし)', macroPer100g: 23.3, kcalPer100g: 105 },
  { name: 'ゆで卵 (1個=55g)', macroPer100g: 12.5, kcalPer100g: 140 },
  { name: 'ツナ缶(水煮)', macroPer100g: 16.0, kcalPer100g: 70 },
  { name: '納豆(1パック=45g)', macroPer100g: 16.5, kcalPer100g: 184 },
  { name: 'ギリシャヨーグルト', macroPer100g: 10.0, kcalPer100g: 70 },
]
const FAT_HINTS: FoodHint[] = [
  { name: 'アボカド(半分=80g)', macroPer100g: 17.5, kcalPer100g: 178 },
  { name: 'くるみ', macroPer100g: 68.8, kcalPer100g: 713 },
  { name: 'サバ(まさば)', macroPer100g: 16.8, kcalPer100g: 211 },
  { name: 'オリーブオイル', macroPer100g: 100.0, kcalPer100g: 894 },
]
const CARB_HINTS: FoodHint[] = [
  { name: 'ごはん(茶碗1杯=150g)', macroPer100g: 37.1, kcalPer100g: 156 },
  { name: '食パン(6枚切1枚=60g)', macroPer100g: 46.4, kcalPer100g: 248 },
  { name: 'バナナ(1本=可食90g)', macroPer100g: 22.5, kcalPer100g: 93 },
  { name: 'さつまいも', macroPer100g: 31.9, kcalPer100g: 126 },
]

export interface HintEntry {
  name: string
  suggestedGrams: number
  providesG: number
  addKcal: number
}

export function suggestFoodsFor(macro: MacroReport['key'], gapG: number): HintEntry[] {
  if (gapG <= 0) return []
  const hints = macro === 'protein' ? PROTEIN_HINTS : macro === 'fat' ? FAT_HINTS : CARB_HINTS
  return hints
    .map((h) => {
      const grams = (gapG / h.macroPer100g) * 100
      return {
        name: h.name,
        suggestedGrams: Math.round(grams),
        providesG: gapG,
        addKcal: Math.round((grams * h.kcalPer100g) / 100),
      }
    })
    .filter((e) => e.suggestedGrams >= 10 && e.suggestedGrams <= 500)
    .slice(0, 3)
}
