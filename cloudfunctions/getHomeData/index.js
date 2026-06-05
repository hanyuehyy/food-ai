const cloud = require('wx-server-sdk')
const { success, fail, resolveIngredientImageUrls } = require('./utils')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const IMAGE_FILE_ID_PREFIX = 'cloud://cloud1-4g4br868e4d093c0.636c-cloud1-4g4br868e4d093c0-1320667469'
const IMAGE_NAME_OVERRIDES = {
  spring_bamboo_shoots: 'food-spring-bamboo-shoot.png',
  winter_bamboo_shoots: 'food-winter-bamboo-shoot.png',
  shepherd_purse: 'food-shepherds-purse.png',
  goji_shoots: 'food-goji-leaves.png',
  broad_bean: 'food-broad-beans.png',
  pea: 'food-peas.png',
  green_pea: 'food-peas.png',
  waxberry: 'food-bayberry.png',
  grape: 'food-grapes.png',
  white_radish: 'food-daikon-radish.png',
  chinese_cabbage: 'food-napa-cabbage.png',
  mandarin: 'food-sugar-orange.png',
  white_mushroom: 'food-white-mushroom.jpg'
}

function buildFallbackImageFileId(ingredientId) {
  const imageName = IMAGE_NAME_OVERRIDES[ingredientId] || `food-${ingredientId.replace(/_/g, '-')}.png`
  return `${IMAGE_FILE_ID_PREFIX}/${imageName}`
}

function getConfigValue(configs, key, fallback) {
  const item = configs.find((config) => config.configKey === key)
  return item ? item.configValue : fallback
}

function normalizeProvinceName(provinceName) {
  return String(provinceName || '')
    .trim()
    .replace('特别行政区', '')
    .replace('壮族自治区', '')
    .replace('回族自治区', '')
    .replace('维吾尔自治区', '')
    .replace('自治区', '')
    .replace('省', '')
    .replace('市', '')
}

function getCurrentMonth() {
  return new Date().getMonth() + 1
}

async function getRegionByProvince(province) {
  const normalizedProvince = normalizeProvinceName(province)

  if (!normalizedProvince) {
    return null
  }

  const res = await db.collection('region_mappings')
    .where({
      province: normalizedProvince,
      status: 'enabled'
    })
    .limit(1)
    .get()

  const region = res.data[0]
  if (!region) {
    return null
  }

  return {
    regionCode: region.regionCode,
    regionName: region.regionName,
    regionShortName: region.regionShortName || region.regionName
  }
}

async function getMonthlySeasonalData(province) {
  try {
    const region = await getRegionByProvince(province)

    if (!region) {
      return null
    }

    const month = getCurrentMonth()
    const rulesRes = await db.collection('monthly_seasonal_rules')
      .where({
        status: 'published',
        showInMonthlySeason: true,
        months: month,
        regions: region.regionCode,
        seasonalityLevel: _.in(['strong', 'medium'])
      })
      .field({
        ingredientId: true,
        name: true,
        seasonTag: true,
        displayReason: true,
        seasonalityLevel: true,
        peakMonths: true,
        priority: true
      })
      .get()

    const levelWeight = {
      strong: 2,
      medium: 1
    }

    const sortedRules = rulesRes.data
      .sort((a, b) => {
        const aPeak = Array.isArray(a.peakMonths) && a.peakMonths.includes(month) ? 1 : 0
        const bPeak = Array.isArray(b.peakMonths) && b.peakMonths.includes(month) ? 1 : 0

        return (
          (levelWeight[b.seasonalityLevel] || 0) - (levelWeight[a.seasonalityLevel] || 0) ||
          bPeak - aPeak ||
          (b.priority || 0) - (a.priority || 0)
        )
      })
      .slice(0, 6)

    if (!sortedRules.length) {
      return null
    }

    const ingredientIds = sortedRules.map((r) => r.ingredientId).filter(Boolean)
    const ingredientMap = {}

    if (ingredientIds.length) {
      const ingredientsRes = await db.collection('ingredients')
        .where({
          ingredientId: _.in(ingredientIds),
          status: 'published'
        })
        .field({
          ingredientId: true,
          imageFileId: true
        })
        .get()

      ingredientsRes.data.forEach((item) => {
        ingredientMap[item.ingredientId] = item
      })
    }

    const rawList = sortedRules.map((rule) => {
      const ingredient = ingredientMap[rule.ingredientId] || {}

      return {
        ingredientId: rule.ingredientId,
        name: rule.name || rule.ingredientId,
        imageUrl: '',
        imageFileId: ingredient.imageFileId || buildFallbackImageFileId(rule.ingredientId),
        seasonTag: rule.seasonTag,
        displayReason: rule.displayReason
      }
    })

    const list = await resolveIngredientImageUrls(rawList)

    return {
      ...region,
      month,
      list,
      disclaimer: '推荐仅供日常饮食参考，具体上市时间会因地区、气候和市场供应情况略有差异。'
    }
  } catch (error) {
    console.warn('[getHomeData] monthly seasonal query skipped', error)
    return null
  }
}

exports.main = async (event = {}) => {
  try {
    const province = event.province || ''
    const [conditionsRes, ingredientsRes, pairingsRes, configsRes, monthlySeasonal] = await Promise.all([
      db.collection('body_conditions')
        .where({ status: 'published', priority: 'P0' })
        .orderBy('sortOrder', 'asc')
        .get(),
      db.collection('ingredients')
        .where({ status: 'published' })
        .orderBy('sortOrder', 'asc')
        .limit(6)
        .field({
          ingredientId: true,
          name: true,
          category: true,
          subCategory: true,
          imageUrl: true,
          imageFileId: true,
          shortDescription: true,
          nutritionTags: true,
          riskTags: true
        })
        .get(),
      db.collection('ingredient_pairings')
        .where({ status: 'published' })
        .orderBy('sortOrder', 'asc')
        .limit(3)
        .field({
          pairingId: true,
          pairingName: true,
          ingredientIds: true,
          pairingReason: true
        })
        .get(),
      db.collection('system_configs')
        .where({
          status: 'enabled',
          configKey: _.in(['global_disclaimer', 'home_search_placeholder'])
        })
        .get(),
      getMonthlySeasonalData(province)
    ])

    const recommendIngredients = await resolveIngredientImageUrls(ingredientsRes.data)

    return success({
      conditions: conditionsRes.data.map((item) => ({
        conditionId: item.conditionId,
        conditionName: item.conditionName,
        iconFileId: item.iconFileId || '',
        userDescription: item.userDescription
      })),
      recommendIngredients,
      recommendPairings: pairingsRes.data,
      monthlySeasonal,
      configs: {
        searchPlaceholder: getConfigValue(
          configsRes.data,
          'home_search_placeholder',
          '搜索食材，比如 鸡蛋、番茄、苹果'
        ),
        globalDisclaimer: getConfigValue(
          configsRes.data,
          'global_disclaimer',
          '内容仅供日常饮食参考，不替代医生诊断或治疗。'
        )
      }
    })
  } catch (error) {
    console.error('[getHomeData] query failed', error)
    return fail(50001, '数据库查询失败')
  }
}
