import { useMemo } from 'react'
import {
  calculatePfcTargetsG,
  evaluateMacros,
  suggestFoodsFor,
  type MacroReport,
  type MacroStatus,
} from '../../domain/pfc'
import type { NutrientsPer100g, UserProfile } from '../../lib/types'

interface PfcAdvisorProps {
  profile: UserProfile
  consumed: NutrientsPer100g
  targetKcal: number
}

const STATUS_STYLE: Record<MacroStatus, { label: string; color: string; bg: string }> = {
  deficit: {
    label: '不足',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  },
  ok: {
    label: '適正',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  },
  excess: {
    label: '過剰',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
}

/**
 * 不足マクロの優先度を決定:
 * - 最も不足度が大きい (gapG / targetG) を先頭に
 * - ただし過剰分は含めない (提案は不足補充にフォーカス)
 */
function pickPrimaryDeficit(reports: MacroReport[]): MacroReport | null {
  const deficits = reports.filter((r) => r.status === 'deficit')
  if (deficits.length === 0) return null
  return deficits.reduce((worst, cur) => {
    const worstRatio = worst.gapG / worst.targetG
    const curRatio = cur.gapG / cur.targetG
    return curRatio > worstRatio ? cur : worst
  })
}

export function PfcAdvisor({ profile, consumed, targetKcal }: PfcAdvisorProps) {
  const { targets, reports, primaryDeficit, hints } = useMemo(() => {
    const t = calculatePfcTargetsG(profile, targetKcal)
    const r = evaluateMacros(consumed, t)
    const primary = pickPrimaryDeficit(r)
    const h = primary ? suggestFoodsFor(primary.key, primary.gapG) : []
    return { targets: t, reports: r, primaryDeficit: primary, hints: h }
  }, [profile, consumed, targetKcal])

  const excessReports = reports.filter((r) => r.status === 'excess')
  const allOk = reports.every((r) => r.status === 'ok')

  return (
    <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
      <h2 className="text-sm font-semibold mb-3">🎯 PFCアドバイザー</h2>

      <ul className="space-y-2 mb-3">
        {reports.map((r) => {
          const style = STATUS_STYLE[r.status]
          const pct = Math.min(150, (r.currentG / r.targetG) * 100)
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">{r.label}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{r.currentG.toFixed(1)}g</span>
                  <span className="text-slate-500"> / {r.targetG.toFixed(0)}g</span>
                  <span className={`ml-2 font-semibold ${style.color}`}>{style.label}</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    r.status === 'ok'
                      ? 'bg-emerald-500'
                      : r.status === 'excess'
                        ? 'bg-amber-500'
                        : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {allOk && (
        <div className={`rounded-lg border p-3 text-sm ${STATUS_STYLE.ok.bg}`}>
          ✅ すべてのマクロ栄養素が適正範囲です。このペースで維持してください。
        </div>
      )}

      {primaryDeficit && (
        <div className={`rounded-lg border p-3 text-sm space-y-2 ${STATUS_STYLE.deficit.bg}`}>
          <div className={STATUS_STYLE.deficit.color}>
            <span className="font-semibold">{primaryDeficit.label}</span> があと{' '}
            <span className="font-semibold tabular-nums">{primaryDeficit.gapG.toFixed(1)}g</span>{' '}
            必要です。
          </div>
          {hints.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-600 dark:text-slate-300">補充候補:</div>
              <ul className="space-y-0.5 text-xs">
                {hints.map((h) => (
                  <li key={h.name} className="flex items-baseline justify-between">
                    <span>{h.name}</span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-400 ml-2">
                      {h.suggestedGrams}g 相当 (+{h.addKcal}kcal)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {excessReports.length > 0 && (
        <div className={`mt-2 rounded-lg border p-3 text-xs ${STATUS_STYLE.excess.bg}`}>
          <span className={STATUS_STYLE.excess.color}>
            ⚠ {excessReports.map((r) => r.label).join(' / ')} が目標を超過しています。
          </span>
          <span className="text-slate-600 dark:text-slate-400 ml-1">
            次の食事は控えめに。
          </span>
        </div>
      )}

      <div className="mt-3 text-[10px] text-slate-400">
        目標: P は体重×{profile.goal === 'lose' ? '1.5' : profile.goal === 'gain' ? '1.6' : '1.2'}g
        {(profile.activityLevel === 'active' || profile.activityLevel === 'very_active') && ' (+0.2 活動係数)'}
        、F/C は目標カロリーの25%/55%
      </div>

      {/* 未使用警告対策: targets を UI には直接出していないが計算には使用済み */}
      {void targets}
    </section>
  )
}
