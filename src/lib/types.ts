/**
 * 可食部100g当たりの栄養素プロファイル。
 * 文部科学省「日本食品標準成分表2020年版（八訂）」の項目に準拠。
 * - 単位は各フィールドのコメントを参照。
 * - 未測定 (文科省表記で "-") は undefined として扱う。0 とは区別する。
 */
export interface NutrientsPer100g {
  /** エネルギー (kcal) */
  kcal: number
  /** タンパク質 (g) */
  protein_g: number
  /** 脂質 (g) */
  fat_g: number
  /** 炭水化物 (g) */
  carb_g: number
  /** 食物繊維総量 (g) */
  fiber_g?: number
  /** 食塩相当量 (g) */
  salt_g?: number
  /** カルシウム (mg) */
  calcium_mg?: number
  /** 鉄 (mg) */
  iron_mg?: number
  /** カリウム (mg) */
  potassium_mg?: number
  /** マグネシウム (mg) */
  magnesium_mg?: number
  /** 亜鉛 (mg) */
  zinc_mg?: number
  /** ビタミンA レチノール活性当量 (μg) */
  vitamin_a_ug?: number
  /** ビタミンD (μg) */
  vitamin_d_ug?: number
  /** ビタミンE α-トコフェロール (mg) */
  vitamin_e_mg?: number
  /** ビタミンK (μg) */
  vitamin_k_ug?: number
  /** ビタミンB1 (mg) */
  vitamin_b1_mg?: number
  /** ビタミンB2 (mg) */
  vitamin_b2_mg?: number
  /** ナイアシン当量 (mg) */
  niacin_mg?: number
  /** ビタミンB6 (mg) */
  vitamin_b6_mg?: number
  /** ビタミンB12 (μg) */
  vitamin_b12_ug?: number
  /** 葉酸 (μg) */
  folate_ug?: number
  /** ビタミンC (mg) */
  vitamin_c_mg?: number
}

/**
 * 食品マスタレコード。per100g 栄養素を基準にグラム数で計算する。
 * source は食品データの出所 (政府公式 / 市販商品DB / ユーザー自作) を示す。
 */
export interface FoodRecord {
  /** 一意ID (MEXT食品番号 or "off:<barcode>" or "custom:<uuid>") */
  id: string
  /** 食品名 (日本語) */
  name: string
  /** よみがな (検索用、カタカナ→ひらがな変換済み) */
  nameKana?: string
  /** カテゴリ (穀類/いも類/野菜類/魚介類/肉類/乳類/...) */
  category?: string
  /** データ出所 */
  source: 'mext' | 'off' | 'custom'
  /** 栄養素 (可食部100g当たり) */
  nutrients: NutrientsPer100g
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Sex = 'male' | 'female'

/**
 * 厚労省「日本人の食事摂取基準」の身体活動レベル区分。
 * 係数は TDEE 計算に使用。
 */
export type ActivityLevel =
  | 'sedentary'   // 座位中心 1.2
  | 'light'       // 軽活動 1.375
  | 'moderate'    // 中活動 1.55
  | 'active'      // 高活動 1.725
  | 'very_active' // 極高 1.9

export type GoalType = 'lose' | 'maintain' | 'gain'

export interface UserProfile {
  /** シングルトン固定キー ("me") */
  id: 'me'
  /** 身長 (cm) */
  heightCm: number
  /** 体重 (kg) - プロファイル用基準体重。日々の体重ログは別機能 (本プロジェクトでは持たない) */
  weightKg: number
  /** 年齢 (歳) */
  age: number
  /** 性別 */
  sex: Sex
  /** 身体活動レベル */
  activityLevel: ActivityLevel
  /** 目標 (減量/維持/増量) */
  goal: GoalType
  /** 作成日時 (ISO 8601) */
  createdAt: string
  /** 更新日時 (ISO 8601) */
  updatedAt: string
}

/**
 * 食事内訳アイテム。保存時に per100g × grams / 100 で栄養素スナップショットを計算し、
 * 後から食品DBを更新しても過去記録は影響を受けないようにする。
 */
export interface MealItem {
  foodId: string
  foodName: string
  grams: number
  /** スナップショット栄養素 (この食事で実際に摂取した量) */
  nutrients: NutrientsPer100g
}

export interface MealRecord {
  /** 一意ID (ULID) */
  id: string
  /** 日付 (YYYY-MM-DD, ローカル時刻基準) */
  date: string
  /** 食事タイプ */
  mealType: MealType
  /** 記録時刻 (ISO 8601) */
  loggedAt: string
  items: MealItem[]
}

/**
 * ミールテンプレ。「いつもの朝食」等を1タップで登録できるようにする。
 */
export interface MealTemplate {
  id: string
  name: string
  defaultMealType?: MealType
  items: MealItem[]
  createdAt: string
  updatedAt: string
}

/**
 * アプリ設定。Gemini API キーは WebCrypto で暗号化してから保存する想定。
 */
export interface AppSettings {
  id: 'settings'
  /** 暗号化済み Gemini API キー (base64) */
  geminiApiKeyCipher?: string
  /** テーマ */
  theme?: 'light' | 'dark' | 'system'
  /** 画像認識の有効化 */
  enableVision?: boolean
  /** Google Drive クライアントID */
  driveClientId?: string
}
