import { useCallback, useEffect, useState } from 'react'
import { getProfile } from './lib/db'
import { ensureFoodsLoaded } from './lib/seedLoader'
import type { UserProfile } from './lib/types'
import { ProfileForm } from './features/profile/ProfileForm'
import { Dashboard } from './features/dashboard/Dashboard'
import { MealLogger } from './features/meal-log/MealLogger'
import { Settings } from './features/settings/Settings'

type View = 'loading' | 'onboarding' | 'dashboard' | 'profile-edit' | 'settings'

export default function App() {
  const [view, setView] = useState<View>('loading')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loaderOpen, setLoaderOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [initError, setInitError] = useState<string | null>(null)

  const baseUrl = import.meta.env.BASE_URL

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await ensureFoodsLoaded(baseUrl)
        const p = await getProfile()
        if (cancelled) return
        setProfile(p)
        setView(p ? 'dashboard' : 'onboarding')
      } catch (err) {
        if (cancelled) return
        setInitError(err instanceof Error ? err.message : '初期化に失敗しました')
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [baseUrl])

  const handleProfileSaved = useCallback((p: UserProfile) => {
    setProfile(p)
    setView('dashboard')
  }, [])

  const handleMealSaved = useCallback(() => {
    setLoaderOpen(false)
    setRefreshKey((k) => k + 1)
  }, [])

  if (initError) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-md rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-5 text-center">
          <div className="text-red-800 dark:text-red-300 text-sm">{initError}</div>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-3 text-xs bg-red-600 text-white rounded-full px-4 py-1.5"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  if (view === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-slate-500 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh max-w-screen-sm mx-auto px-4 py-6">
      {view === 'onboarding' && (
        <>
          <header className="mb-4">
            <h1 className="text-2xl font-bold">🍚 MeshiTrack へようこそ</h1>
            <p className="text-sm text-slate-500">
              身長・体重・年齢・性別・活動レベルから推奨カロリーを算出します。
            </p>
          </header>
          <ProfileForm onSaved={handleProfileSaved} />
        </>
      )}

      {view === 'profile-edit' && profile && (
        <>
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">プロファイル設定</h1>
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="text-sm text-slate-500"
            >
              戻る
            </button>
          </header>
          <ProfileForm initial={profile} onSaved={handleProfileSaved} />
        </>
      )}

      {view === 'dashboard' && profile && (
        <Dashboard
          profile={profile}
          refreshKey={refreshKey}
          onOpenLogger={() => setLoaderOpen(true)}
          onOpenProfile={() => setView('profile-edit')}
          onOpenSettings={() => setView('settings')}
        />
      )}

      {view === 'settings' && <Settings onClose={() => setView('dashboard')} />}

      {loaderOpen && (
        <MealLogger onClose={() => setLoaderOpen(false)} onSaved={handleMealSaved} />
      )}
    </div>
  )
}
