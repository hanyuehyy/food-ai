import { CLOUD_FUNCTIONS } from '@/config/cloud'
import type {
  CloudResponse,
  IngredientDetailData,
  HomeData,
  IngredientListData,
  IngredientListQuery
} from '@/types/cloud'

type CloudFunctionName = keyof typeof CLOUD_FUNCTIONS

export function callCloudFunction<T>(
  name: CloudFunctionName,
  data: Record<string, unknown> = {}
): Promise<CloudResponse<T>> {
  // #ifdef MP-WEIXIN
  const cloud = wx.cloud

  if (!cloud) {
    return Promise.reject(new Error('当前微信基础库不支持云开发'))
  }

  return cloud.callFunction({
    name: CLOUD_FUNCTIONS[name],
    data
  }).then((res) => res.result as CloudResponse<T>)
  // #endif

  // #ifndef MP-WEIXIN
  return Promise.reject(new Error('当前运行环境不支持 wx.cloud.callFunction'))
  // #endif
}

export function getHomeData() {
  return callCloudFunction<HomeData>('getHomeData')
}

export function getHomeDataByProvince(province?: string) {
  return callCloudFunction<HomeData>('getHomeData', { province })
}

export function getIngredientList(query: IngredientListQuery = {}) {
  return callCloudFunction<IngredientListData>('getIngredientList', { ...query })
}

export function getIngredientDetail(ingredientId: string) {
  return callCloudFunction<IngredientDetailData>('getIngredientDetail', { ingredientId })
}
