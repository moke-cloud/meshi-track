import type { FoodRecord, NutrientsPer100g } from '../lib/types'

/**
 * Open Food Facts API クライアント。
 *
 * - ライセンス: ODbL (データベース) / CC-BY-SA (商品データ)
 * - 完全無料、APIキー不要
 * - User-Agent は礼儀として明示する (OFFのAPIルール)
 * - 日本商品のカバー率は30〜50%程度。未ヒット時は呼び出し側で手動登録フォールバック
 */

const USER_AGENT = 'MeshiTrack/0.1 (personal use; https://github.com/moke-cloud/meshi-track)'

interface OffProduct {
  product_name?: string
  product_name_ja?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    'energy_100g'?: number // kJ
    proteins_100g?: number
    fat_100g?: number
    carbohydrates_100g?: number
    fiber_100g?: number
    salt_100g?: number
    sodium_100g?: number
    calcium_100g?: number
    iron_100g?: number
    potassium_100g?: number
    'vitamin-c_100g'?: number
  }
  serving_size?: string
  serving_quantity?: number
}

interface OffResponse {
  status: 0 | 1
  product?: OffProduct
}

/**
 * JANコード → FoodRecord (source='off'). 見つからなければ null。
 */
export async function lookupBarcode(barcode: string): Promise<FoodRecord | null> {
  // バーコードは数字のみ許可。インジェクション対策も兼ねる。
  if (!/^\d{8,14}$/.test(barcode)) {
    throw new Error('バーコードは8〜14桁の数字である必要があります')
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`OFF API エラー: HTTP ${res.status}`)
  }
  const body = (await res.json()) as OffResponse
  if (body.status !== 1 || !body.product) return null

  const p = body.product
  const name = p.product_name_ja || p.product_name
  if (!name) return null

  const n = p.nutriments ?? {}
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : undefined)
  if (kcal === undefined) return null // kcalが無いレコードは採用しない

  const nutrients: NutrientsPer100g = {
    kcal,
    protein_g: n.proteins_100g ?? 0,
    fat_g: n.fat_100g ?? 0,
    carb_g: n.carbohydrates_100g ?? 0,
    fiber_g: n.fiber_100g,
    salt_g: n.salt_100g ?? (n.sodium_100g !== undefined ? n.sodium_100g * 2.54 : undefined),
    calcium_mg: n.calcium_100g !== undefined ? n.calcium_100g * 1000 : undefined,
    iron_mg: n.iron_100g !== undefined ? n.iron_100g * 1000 : undefined,
    potassium_mg: n.potassium_100g !== undefined ? n.potassium_100g * 1000 : undefined,
    vitamin_c_mg: n['vitamin-c_100g'] !== undefined ? n['vitamin-c_100g'] * 1000 : undefined,
  }

  return {
    id: `off:${barcode}`,
    name: p.brands ? `${name} (${p.brands})` : name,
    category: '市販食品',
    source: 'off',
    nutrients,
  }
}

/** サービング量 (g) を推定。OFFの serving_quantity があればそれ、なければ null。 */
export function getServingGrams(product: FoodRecord): number | null {
  // 現状 FoodRecord にサービング量は持たせていない。将来拡張予定。
  void product
  return null
}
