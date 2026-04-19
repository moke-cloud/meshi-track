import { useEffect, useMemo, useState } from 'react'
import { deleteMeal, getMealsByDate } from '../../lib/db'
import type { MealRecord, UserProfile } from '../../lib/types'
import { calculateTargetCalories } from '../../domain/tdee'
import { sumNutrients } from '../../domain/nutrients'
import { calculatePfcRatios } from '../../domain/pfc'
import { MEAL_TYPE_LABELS, toLocalDateString } from '../../lib/datetime'
import { PfcPieChart } from './PfcPieChart'
import { NutrientBars } from './NutrientBars'

interface DashboardProps {
  profile: UserProfile
  refreshKey: number
  onOpenLogger: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
}

export function Dashboard({ profile, refreshKey, onOpenLogger, onOpenProfile, onOpenSettings }: DashboardProps) {
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [loading, setLoading] = useState(true)
  const today = toLocalDateString()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMealsByDate(today)
      .then((m) => {
        if (!cancelled) setMeals(m)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [today, refreshKey])

  const allItems = useMemo(() => meals.flatMap((m) => m.items), [meals])
  const totalNutrients = useMemo(
    () => sumNutrients(allItems.map((i) => i.nutrients)),
    [allItems],
  )
  const pfcRatios = useMemo(() => calculatePfcRatios(totalNutrients), [totalNutrients])

  const target = Math.round(calculateTargetCalories(profile))
  const consumed = Math.round(totalNutrients.kcal)
  const remaining = target - consumed
  const pct = Math.min(100, Math.max(0, Math.round((consumed / target) * 100)))

  async function handleDelete(id: string) {
    if (!confirm('この食事記録を削除しますか？')) return
    await deleteMeal(id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🍚 MeshiTrack</h1>
          <div className="text-xs text-slate-500">{today}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
            aria-label="プロファイル"
          >
            👤
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
            aria-label="設定"
          >
            ⚙
          </button>
        </div>
      </header>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-xs text-slate-500">今日のカロリー</div>
          <div className="text-xs text-slate-500">推奨 {target} kcal</div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-4xl font-bold tabular-nums">{consumed}</div>
          <div className="text-slate-500">/ {target} kcal</div>
        </div>

        <div className="mt-3 h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full transition-all ${
              remaining < 0
                ? 'bg-red-500'
                : pct >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 text-sm tabular-nums">
          {remaining >= 0 ? (
            <>
              残り <span className="font-semibold">{remaining}</span> kcal
            </>
          ) : (
            <>
              <span className="text-red-600 dark:text-red-400 font-semibold">{Math.abs(remaining)} kcal オーバー</span>
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-sm font-semibold mb-3">PFCバランス</h2>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
          <PfcPieChart ratios={pfcRatios} />
          <div className="text-xs space-y-1 tabular-nums">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
              <span>P</span>
              <span className="ml-auto font-semibold">{totalNutrients.protein_g.toFixed(1)}g</span>
              <span className="text-slate-500 w-10 text-right">
                {Math.round(pfcRatios.p_ratio * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
              <span>F</span>
              <span className="ml-auto font-semibold">{totalNutrients.fat_g.toFixed(1)}g</span>
              <span className="text-slate-500 w-10 text-right">
                {Math.round(pfcRatios.f_ratio * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block"></span>
              <span>C</span>
              <span className="ml-auto font-semibold">{totalNutrients.carb_g.toFixed(1)}g</span>
              <span className="text-slate-500 w-10 text-right">
                {Math.round(pfcRatios.c_ratio * 100)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-sm font-semibold mb-3">主要栄養素</h2>
        <NutrientBars nutrients={totalNutrients} profile={profile} />
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">今日の記録 ({meals.length})</h2>
          <button
            type="button"
            onClick={onOpenLogger}
            className="text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full px-4 py-1.5 font-semibold"
          >
            + 記録
          </button>
        </div>

        {loading && <div className="text-sm text-slate-500 text-center py-4">読み込み中...</div>}
        {!loading && meals.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-6">
            まだ記録がありません。「+ 記録」から食事を追加してください。
          </div>
        )}

        <ul className="space-y-2">
          {meals.map((m) => {
            const mealKcal = Math.round(m.items.reduce((acc, i) => acc + i.nutrients.kcal, 0))
            return (
              <li
                key={m.id}
                className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3"
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-xs text-slate-500">
                    {MEAL_TYPE_LABELS[m.mealType]} · {new Date(m.loggedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{mealKcal} kcal</div>
                </div>
                <ul className="mt-1 text-sm space-y-0.5">
                  {m.items.map((i, idx) => (
                    <li key={idx} className="flex items-baseline justify-between">
                      <span>{i.foodName}</span>
                      <span className="text-xs text-slate-500 tabular-nums">{i.grams}g</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  削除
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <button
        type="button"
        onClick={onOpenLogger}
        className="fixed safe-bottom-0 right-5 w-14 h-14 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg text-2xl font-bold"
        aria-label="食事を記録"
      >
        +
      </button>

      <footer className="text-xs text-slate-400 text-center pt-4 pb-20">
        データ出典: 文部科学省 日本食品標準成分表2020年版（八訂）
      </footer>
    </div>
  )
}
