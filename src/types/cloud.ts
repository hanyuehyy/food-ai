export interface CloudResponse<T> {
  success: boolean
  code: number
  message: string
  data: T
}

export interface HomeCondition {
  conditionId: string
  conditionName: string
  iconFileId?: string
  userDescription: string
}

export interface IngredientCard {
  ingredientId: string
  name: string
  alias?: string[]
  category: string
  subCategory?: string
  imageUrl?: string
  imageFileId?: string
  shortDescription: string
  nutritionTags: string[]
  riskTags?: string[]
}

export interface MonthlySeasonalIngredient {
  ingredientId: string
  name: string
  imageUrl?: string
  imageFileId?: string
  seasonTag: string
  displayReason: string
}

export interface MonthlySeasonalData {
  regionCode: string
  regionName: string
  regionShortName: string
  month: number
  list: MonthlySeasonalIngredient[]
  disclaimer: string
}

export interface IngredientCaution {
  type: string
  text: string
  severity: 'low' | 'medium' | 'high' | string
}

export interface IngredientDetail {
  ingredientId: string
  name: string
  alias?: string[]
  category: string
  subCategory?: string
  imageUrl?: string
  imageFileId?: string
  shortDescription: string
  nutrition?: Record<string, unknown>
  nutritionTags: string[]
  sceneTags: string[]
  riskTags: string[]
  cautions: IngredientCaution[]
  disclaimer: string
}

export interface PairingCard {
  pairingId: string
  pairingName: string
  ingredientIds: string[]
  pairingReason: string
}

export interface PairingIngredient {
  ingredientId: string
  name: string
  imageUrl?: string
  imageFileId?: string
}

export interface IngredientPairingDetail extends PairingCard {
  ingredientNames: string[]
  ingredientInitials: string[]
  ingredients?: PairingIngredient[]
  suitableConditionIds: string[]
  cookingMethod: string
  cookingTime: string
}

export interface KnowledgeSource {
  sourceId: string
  sourceName: string
  sourceType: string
  organization: string
  version: string
  publishYear: string
  reliabilityLevel: string
}

export interface HomeData {
  conditions: HomeCondition[]
  recommendIngredients: IngredientCard[]
  recommendPairings: PairingCard[]
  monthlySeasonal: MonthlySeasonalData | null
  configs: {
    searchPlaceholder: string
    globalDisclaimer: string
  }
}

export interface IngredientListQuery {
  keyword?: string
  category?: string
  page?: number
  pageSize?: number
}

export interface IngredientListData {
  list: IngredientCard[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface IngredientDetailData {
  ingredient: IngredientDetail
  conditions: HomeCondition[]
  pairings: IngredientPairingDetail[]
  sources: KnowledgeSource[]
}
