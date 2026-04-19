import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type { AppSettings, FoodRecord, MealRecord, MealTemplate, UserProfile } from './types'

/**
 * IndexedDB スキーマ定義。
 *
 * ⚠️ データ永続化に関する重要な注意事項 ⚠️
 * ユーザーの食事記録・プロファイル・カスタム食品はすべて IndexedDB に保存される。
 * 既存ユーザーのデータを絶対に失わないためのルール:
 *
 * 1. DB_NAME ('meshi-track') を変更しない。変更するとブラウザ上で旧DBが孤立する。
 * 2. DB_VERSION を上げる際は upgrade() 内で段階的マイグレーションを書く。
 *    - 新しい objectStore の追加は安全 (既存ストアは触らない)。
 *    - 既存ストアの keyPath 変更・削除は絶対禁止。
 *      必要なら全データを読み出し → 新スキーマへ変換 → 新ストアに書き戻すマイグレーションを書く。
 * 3. 型 (lib/types.ts) に新フィールドを追加するときは optional (`?`) にするか、
 *    読み出し後にデフォルト値を補完する。既存レコードに無いと undefined になる。
 * 4. objectStore.clear() / deleteObjectStore() はマイグレーション以外で絶対呼ばない。
 * 5. テスト (fake-indexeddb) と本番で同じスキーマ・バージョン番号を使う。
 */
const DB_NAME = 'meshi-track'
const DB_VERSION = 1

interface MeshiTrackDB extends DBSchema {
  /** ユーザープロファイル (シングルトン、id='me') */
  profile: {
    key: 'me'
    value: UserProfile
  }
  /** アプリ設定 (シングルトン、id='settings') */
  settings: {
    key: 'settings'
    value: AppSettings
  }
  /** 食品マスタ (MEXT + OFF + custom) */
  foods: {
    key: string
    value: FoodRecord
    indexes: { 'by-category': string; 'by-source': string }
  }
  /** 食事記録 */
  meals: {
    key: string
    value: MealRecord
    indexes: { 'by-date': string }
  }
  /** ミールテンプレ */
  templates: {
    key: string
    value: MealTemplate
  }
}

let dbPromise: Promise<IDBPDatabase<MeshiTrackDB>> | null = null

function getDB(): Promise<IDBPDatabase<MeshiTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MeshiTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // 新規インストール or 初回 v1 作成
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('foods')) {
            const foods = db.createObjectStore('foods', { keyPath: 'id' })
            foods.createIndex('by-category', 'category')
            foods.createIndex('by-source', 'source')
          }
          if (!db.objectStoreNames.contains('meals')) {
            const meals = db.createObjectStore('meals', { keyPath: 'id' })
            meals.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('templates')) {
            db.createObjectStore('templates', { keyPath: 'id' })
          }
        }
        // 将来 DB_VERSION を上げるときは oldVersion を見て段階的に upgrade する。
        //   if (oldVersion < 2) { /* v1 → v2 の差分のみ。既存データは保持 */ }
      },
    })
  }
  return dbPromise
}

// ---------- Profile ----------
export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDB()
  const p = await db.get('profile', 'me')
  return p ?? null
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB()
  await db.put('profile', profile)
}

// ---------- Settings ----------
export async function getSettings(): Promise<AppSettings | null> {
  const db = await getDB()
  const s = await db.get('settings', 'settings')
  return s ?? null
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings)
}

// ---------- Foods ----------
export async function getFood(id: string): Promise<FoodRecord | null> {
  const db = await getDB()
  const f = await db.get('foods', id)
  return f ?? null
}

export async function putFood(food: FoodRecord): Promise<void> {
  const db = await getDB()
  await db.put('foods', food)
}

export async function bulkPutFoods(foods: readonly FoodRecord[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('foods', 'readwrite')
  await Promise.all([...foods.map((f) => tx.store.put(f)), tx.done])
}

export async function countFoods(): Promise<number> {
  const db = await getDB()
  return db.count('foods')
}

export async function searchFoodsByName(query: string, limit = 30): Promise<FoodRecord[]> {
  const db = await getDB()
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: FoodRecord[] = []
  let cursor = await db.transaction('foods').store.openCursor()
  while (cursor && results.length < limit) {
    const f = cursor.value
    const haystack = `${f.name}\n${f.nameKana ?? ''}`.toLowerCase()
    if (haystack.includes(q)) {
      results.push(f)
    }
    cursor = await cursor.continue()
  }
  return results
}

// ---------- Meals ----------
export async function getMealsByDate(date: string): Promise<MealRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('meals', 'by-date', date)
}

export async function putMeal(meal: MealRecord): Promise<void> {
  const db = await getDB()
  await db.put('meals', meal)
}

export async function deleteMeal(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('meals', id)
}

// ---------- Templates ----------
export async function getTemplates(): Promise<MealTemplate[]> {
  const db = await getDB()
  return db.getAll('templates')
}

export async function putTemplate(tpl: MealTemplate): Promise<void> {
  const db = await getDB()
  await db.put('templates', tpl)
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('templates', id)
}
