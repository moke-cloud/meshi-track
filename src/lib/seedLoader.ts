import { z } from 'zod'
import { bulkPutFoods, countFoods } from './db'
import type { FoodRecord } from './types'

const nutrientsSchema = z.object({
  kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carb_g: z.number(),
  fiber_g: z.number().optional(),
  salt_g: z.number().optional(),
  calcium_mg: z.number().optional(),
  iron_mg: z.number().optional(),
  potassium_mg: z.number().optional(),
  magnesium_mg: z.number().optional(),
  zinc_mg: z.number().optional(),
  vitamin_a_ug: z.number().optional(),
  vitamin_d_ug: z.number().optional(),
  vitamin_e_mg: z.number().optional(),
  vitamin_k_ug: z.number().optional(),
  vitamin_b1_mg: z.number().optional(),
  vitamin_b2_mg: z.number().optional(),
  niacin_mg: z.number().optional(),
  vitamin_b6_mg: z.number().optional(),
  vitamin_b12_ug: z.number().optional(),
  folate_ug: z.number().optional(),
  vitamin_c_mg: z.number().optional(),
})

const foodRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameKana: z.string().optional(),
  category: z.string().optional(),
  source: z.enum(['mext', 'off', 'custom']),
  nutrients: nutrientsSchema,
})

const foodsArraySchema = z.array(foodRecordSchema)

/**
 * 初回起動時に seed/full JSONを IndexedDB に取り込む。
 * - すでに食品が存在する (countFoods() > 0) 場合はスキップする。
 *   → 既存ユーザーのcustom食品や以前のシードが上書きされないことを保証。
 * - 取り込み失敗時は catch で握りつぶさず呼び出し元に投げる。
 *
 * 優先度:
 *   1. public/data/mext_foods.json (完全版、Python変換後) があればそれを使う
 *   2. なければ foods_seed.json (手動キュレーション40食品) を使う
 */
export async function ensureFoodsLoaded(baseUrl: string): Promise<{ loaded: number; skipped: boolean }> {
  const existing = await countFoods()
  if (existing > 0) {
    return { loaded: existing, skipped: true }
  }

  const candidates = [`${baseUrl}data/mext_foods.json`, `${baseUrl}data/foods_seed.json`]
  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const raw = (await res.json()) as unknown
      const parsed = foodsArraySchema.parse(raw) as FoodRecord[]
      await bulkPutFoods(parsed)
      return { loaded: parsed.length, skipped: false }
    } catch {
      // 次の候補にフォールバック
      continue
    }
  }
  throw new Error('食品データの読み込みに失敗しました')
}
