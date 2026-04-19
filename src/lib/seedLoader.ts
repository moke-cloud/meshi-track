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
 * 初回起動時に食品DBを IndexedDB に取り込む。
 * - 主DB (MEXT/seed) と惣菜DB (dishes_seed) を両方ロードする。
 * - 既存データがある場合は個別に「未ロードなら追加」の差分ロードを行う。
 *   → 既存ユーザーも「和食惣菜DB」を後から受け取れる。
 * - 取り込み失敗時は catch で握りつぶさず呼び出し元に投げる。
 */
async function fetchAndValidate(url: string): Promise<FoodRecord[] | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const raw = (await res.json()) as unknown
    return foodsArraySchema.parse(raw) as FoodRecord[]
  } catch {
    return null
  }
}

export async function ensureFoodsLoaded(baseUrl: string): Promise<{ loaded: number; skipped: boolean }> {
  const existing = await countFoods()

  // 主食品DB (MEXT 全量 or seed) - 既存データがあればスキップ
  if (existing === 0) {
    const primaryCandidates = [`${baseUrl}data/mext_foods.json`, `${baseUrl}data/foods_seed.json`]
    for (const url of primaryCandidates) {
      const data = await fetchAndValidate(url)
      if (data) {
        await bulkPutFoods(data)
        break
      }
    }
  }

  // 惣菜DBは ID 重複でも上書き更新OK (最新の栄養値を反映)
  const dishes = await fetchAndValidate(`${baseUrl}data/dishes_seed.json`)
  if (dishes) {
    await bulkPutFoods(dishes)
  }

  const finalCount = await countFoods()
  if (finalCount === 0) {
    throw new Error('食品データの読み込みに失敗しました')
  }
  return { loaded: finalCount, skipped: existing > 0 && !dishes }
}
