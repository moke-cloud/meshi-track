import { useState } from 'react'
import { saveProfile } from '../../lib/db'
import type { ActivityLevel, GoalType, Sex, UserProfile } from '../../lib/types'
import { calculateTargetCalories } from '../../domain/tdee'

interface ProfileFormProps {
  initial?: UserProfile | null
  onSaved: (profile: UserProfile) => void
}

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: '座位中心', description: 'デスクワーク中心、ほぼ運動しない (×1.2)' },
  { value: 'light', label: '軽活動', description: '通勤・家事・軽い運動を週1〜2回 (×1.375)' },
  { value: 'moderate', label: '中活動', description: '立ち仕事・運動を週3〜5回 (×1.55)' },
  { value: 'active', label: '高活動', description: '肉体労働・運動を週6〜7回 (×1.725)' },
  { value: 'very_active', label: '極高活動', description: 'アスリート・重肉体労働 (×1.9)' },
]

const GOAL_OPTIONS: { value: GoalType; label: string; description: string }[] = [
  { value: 'lose', label: '減量', description: 'TDEEから-500 kcal (週0.5kg減目安)' },
  { value: 'maintain', label: '維持', description: '現状維持' },
  { value: 'gain', label: '増量', description: 'TDEEに+300 kcal' },
]

export function ProfileForm({ initial, onSaved }: ProfileFormProps) {
  const [heightCm, setHeightCm] = useState<number>(initial?.heightCm ?? 170)
  const [weightKg, setWeightKg] = useState<number>(initial?.weightKg ?? 65)
  const [age, setAge] = useState<number>(initial?.age ?? 30)
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initial?.activityLevel ?? 'moderate')
  const [goal, setGoal] = useState<GoalType>(initial?.goal ?? 'maintain')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // プレビュー用の仮プロファイル (保存前でも推奨カロリーを確認できる)
  const preview: UserProfile = {
    id: 'me',
    heightCm,
    weightKg,
    age,
    sex,
    activityLevel,
    goal,
    createdAt: initial?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const targetKcal = Math.round(calculateTargetCalories(preview))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (heightCm < 100 || heightCm > 250) return setError('身長は100〜250cmの範囲で入力してください')
    if (weightKg < 20 || weightKg > 300) return setError('体重は20〜300kgの範囲で入力してください')
    if (age < 10 || age > 120) return setError('年齢は10〜120歳の範囲で入力してください')

    setSaving(true)
    try {
      await saveProfile(preview)
      onSaved(preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-lg font-semibold mb-3">基本情報</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-600 dark:text-slate-300">身長 (cm)</span>
            <input
              type="number"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-base"
              min={100}
              max={250}
              step={0.1}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 dark:text-slate-300">体重 (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-base"
              min={20}
              max={300}
              step={0.1}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 dark:text-slate-300">年齢</span>
            <input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-base"
              min={10}
              max={120}
              step={1}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 dark:text-slate-300">性別</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setSex(v)}
                  className={`py-2 rounded-lg border text-sm ${
                    sex === v
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {v === 'male' ? '男性' : '女性'}
                </button>
              ))}
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-lg font-semibold mb-3">身体活動レベル</h2>
        <div className="space-y-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`block rounded-lg border p-3 cursor-pointer transition ${
                activityLevel === opt.value
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="activity"
                value={opt.value}
                checked={activityLevel === opt.value}
                onChange={() => setActivityLevel(opt.value)}
                className="sr-only"
              />
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-5">
        <h2 className="text-lg font-semibold mb-3">目標</h2>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setGoal(opt.value)}
              className={`rounded-lg border p-3 text-center ${
                goal === opt.value
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-[10px] text-slate-500 mt-1 leading-tight">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-5 text-center">
        <div className="text-xs text-emerald-800 dark:text-emerald-300 mb-1">推奨カロリー (プレビュー)</div>
        <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">
          {targetKcal}
          <span className="text-base font-normal ml-1">kcal/日</span>
        </div>
        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
          Mifflin-St Jeor 式 × 活動係数 + 目標補正
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 font-semibold disabled:opacity-50"
      >
        {saving ? '保存中...' : initial ? '更新' : '保存して開始'}
      </button>
    </form>
  )
}
