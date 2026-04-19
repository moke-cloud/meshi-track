import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProfile,
  saveProfile,
  getMealsByDate,
  putMeal,
  bulkPutFoods,
  searchFoodsByName,
  countFoods,
} from './db'
import type { FoodRecord, MealRecord, UserProfile } from './types'

// fake-indexeddb/auto (src/test/setup.ts) により indexedDB が使える
beforeEach(() => {
  // fake-indexeddb の database を完全にリセット
  const databases = indexedDB as unknown as {
    _databases?: Map<string, unknown>
  }
  if (databases._databases) databases._databases.clear()
})

describe('profile CRUD', () => {
  it('returns null when not set', async () => {
    expect(await getProfile()).toBeNull()
  })

  it('round-trips saveProfile / getProfile', async () => {
    const p: UserProfile = {
      id: 'me',
      heightCm: 170,
      weightKg: 65,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
      goal: 'maintain',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    await saveProfile(p)
    expect(await getProfile()).toEqual(p)
  })
})

describe('meals by date', () => {
  it('returns only meals of the given date', async () => {
    const m1: MealRecord = {
      id: 'm1',
      date: '2026-04-19',
      mealType: 'breakfast',
      loggedAt: '2026-04-19T07:00:00Z',
      items: [],
    }
    const m2: MealRecord = {
      id: 'm2',
      date: '2026-04-20',
      mealType: 'lunch',
      loggedAt: '2026-04-20T12:00:00Z',
      items: [],
    }
    await putMeal(m1)
    await putMeal(m2)

    const today = await getMealsByDate('2026-04-19')
    expect(today).toHaveLength(1)
    expect(today[0].id).toBe('m1')
  })
})

describe('foods search', () => {
  const sampleFoods: FoodRecord[] = [
    {
      id: '11234',
      name: '鶏むね肉',
      nameKana: 'とりむねにく',
      category: '肉類',
      source: 'mext',
      nutrients: { kcal: 108, protein_g: 22.3, fat_g: 1.5, carb_g: 0 },
    },
    {
      id: '01088',
      name: '白米',
      nameKana: 'はくまい',
      category: '穀類',
      source: 'mext',
      nutrients: { kcal: 156, protein_g: 2.5, fat_g: 0.3, carb_g: 37.1 },
    },
  ]

  it('searches by kanji name', async () => {
    await bulkPutFoods(sampleFoods)
    const results = await searchFoodsByName('鶏')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('11234')
  })

  it('searches by kana', async () => {
    await bulkPutFoods(sampleFoods)
    const results = await searchFoodsByName('はく')
    expect(results.map((f) => f.id)).toContain('01088')
  })

  it('returns empty array for blank query', async () => {
    await bulkPutFoods(sampleFoods)
    expect(await searchFoodsByName('')).toEqual([])
    expect(await searchFoodsByName('   ')).toEqual([])
  })

  it('countFoods returns inserted count', async () => {
    await bulkPutFoods(sampleFoods)
    expect(await countFoods()).toBe(2)
  })
})
