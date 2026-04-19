import type { NutrientsPer100g, UserProfile } from '../../lib/types'

/**
 * 推奨摂取量 (RDA/AI/DG) の近似値。
 * 日本人の食事摂取基準2020/2025年版 を参照した成人向け概算。
 * 厳密な性別×年齢別テーブルは Phase 3 で拡充予定。
 */
function getTargets(profile: UserProfile): Record<string, { value: number; unit: string; label: string }> {
  // タンパク質の推奨: 体重 × 1.0〜1.2g (一般人)、高活動は 1.4〜1.6g
  const proteinG =
    profile.activityLevel === 'active' || profile.activityLevel === 'very_active'
      ? profile.weightKg * 1.4
      : profile.weightKg * 1.0

  // 食物繊維 DG: 成人男性 21g、女性 18g
  const fiberG = profile.sex === 'male' ? 21 : 18
  // 食塩相当量 DG: 成人男性 <7.5g、女性 <6.5g (WHO推奨は5g)
  const saltG = profile.sex === 'male' ? 7.5 : 6.5
  // カルシウム RDA: 成人 650〜800mg
  const calciumMg = profile.sex === 'male' ? 800 : 650
  // 鉄 RDA: 成人男性 7.5mg、月経有女性 10.5mg (ここは女性=月経ありと近似)
  const ironMg = profile.sex === 'male' ? 7.5 : 10.5
  // ビタミンC RDA: 成人 100mg
  const vitaminCMg = 100

  return {
    protein_g: { value: proteinG, unit: 'g', label: 'タンパク質' },
    fiber_g: { value: fiberG, unit: 'g', label: '食物繊維' },
    salt_g: { value: saltG, unit: 'g', label: '食塩相当量 (上限)' },
    calcium_mg: { value: calciumMg, unit: 'mg', label: 'カルシウム' },
    iron_mg: { value: ironMg, unit: 'mg', label: '鉄' },
    vitamin_c_mg: { value: vitaminCMg, unit: 'mg', label: 'ビタミンC' },
  }
}

interface NutrientBarsProps {
  nutrients: NutrientsPer100g
  profile: UserProfile
}

export function NutrientBars({ nutrients, profile }: NutrientBarsProps) {
  const targets = getTargets(profile)

  return (
    <ul className="space-y-2">
      {Object.entries(targets).map(([key, t]) => {
        const value = (nutrients as unknown as Record<string, number>)[key] ?? 0
        const ratio = t.value > 0 ? value / t.value : 0
        const pct = Math.min(150, ratio * 100)
        const isSalt = key === 'salt_g'
        // 食塩は「上限」なので 100% 超過で赤、それ以外の栄養素は 80% 未満で赤(不足)
        const color = isSalt
          ? pct > 100
            ? 'bg-red-500'
            : pct > 80
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          : pct >= 100
            ? 'bg-emerald-500'
            : pct >= 60
              ? 'bg-amber-500'
              : 'bg-red-400'

        return (
          <li key={key}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">{t.label}</span>
              <span className="tabular-nums text-slate-500">
                {value.toFixed(key.endsWith('_g') ? 1 : 0)}
                {t.unit} / {t.value}
                {t.unit}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all ${color}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
