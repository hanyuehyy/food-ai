const cloud = require('wx-server-sdk')
const { success, fail, resolveIngredientImageUrls } = require('./utils')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function uniq(values) {
  return [...new Set(values.filter(Boolean))]
}

function pickIngredientInitial(id, ingredientMap) {
  const ingredient = ingredientMap[id]
  return ingredient ? ingredient.name.slice(0, 1) : ''
}

exports.main = async (event = {}) => {
  const ingredientId = String(event.ingredientId || '').trim()

  if (!ingredientId) {
    return fail(40001, '缺少食材 ID')
  }

  try {
    const ingredientRes = await db.collection('ingredients')
      .where({
        ingredientId,
        status: 'published'
      })
      .limit(1)
      .get()

    const ingredient = ingredientRes.data[0]
    if (!ingredient) {
      return fail(40401, '未找到食材')
    }

    const suitableConditionIds = Array.isArray(ingredient.suitableConditionIds)
      ? ingredient.suitableConditionIds
      : []
    const sourceIds = Array.isArray(ingredient.sourceIds) ? ingredient.sourceIds : []

    const [conditionsRes, pairingsRes, sourcesRes] = await Promise.all([
      suitableConditionIds.length
        ? db.collection('body_conditions')
          .where({
            conditionId: _.in(suitableConditionIds),
            status: 'published'
          })
          .field({
            conditionId: true,
            conditionName: true,
            iconName: true,
            userDescription: true,
            sortOrder: true
          })
          .get()
        : Promise.resolve({ data: [] }),
      db.collection('ingredient_pairings')
        .where({
          ingredientIds: ingredientId,
          status: 'published'
        })
        .field({
          pairingId: true,
          pairingName: true,
          ingredientIds: true,
          suitableConditionIds: true,
          pairingReason: true,
          cookingMethod: true,
          cookingTime: true,
          sortOrder: true
        })
        .get(),
      sourceIds.length
        ? db.collection('knowledge_sources')
          .where({
            sourceId: _.in(sourceIds),
            status: 'published'
          })
          .field({
            sourceId: true,
            sourceName: true,
            sourceType: true,
            organization: true,
            version: true,
            publishYear: true,
            reliabilityLevel: true,
            sortOrder: true
          })
          .get()
        : Promise.resolve({ data: [] })
    ])

    const pairingIngredientIds = uniq(
      pairingsRes.data.flatMap((pairing) => (
        Array.isArray(pairing.ingredientIds) ? pairing.ingredientIds : []
      ))
    )

    const pairingIngredientsRes = pairingIngredientIds.length
      ? await db.collection('ingredients')
        .where({
          ingredientId: _.in(pairingIngredientIds),
          status: 'published'
        })
        .field({
          ingredientId: true,
          name: true,
          imageUrl: true,
          imageFileId: true
        })
        .get()
      : { data: [] }

    const [ingredientWithImage] = await resolveIngredientImageUrls([ingredient])
    const pairingIngredientsWithImages = await resolveIngredientImageUrls(pairingIngredientsRes.data)

    const ingredientMap = pairingIngredientsWithImages.reduce((map, item) => {
      map[item.ingredientId] = item
      return map
    }, {})

    const conditions = conditionsRes.data
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item) => ({
        conditionId: item.conditionId,
        conditionName: item.conditionName,
        iconName: item.iconName || '',
        userDescription: item.userDescription || ''
      }))

    const pairings = pairingsRes.data
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item) => {
        const itemIngredientIds = Array.isArray(item.ingredientIds) ? item.ingredientIds : []

        return {
          pairingId: item.pairingId,
          pairingName: item.pairingName,
          ingredientIds: itemIngredientIds,
          ingredientNames: itemIngredientIds
            .map((id) => ingredientMap[id]?.name)
            .filter(Boolean),
          ingredients: itemIngredientIds
            .map((id) => ingredientMap[id])
            .filter(Boolean)
            .map((item) => ({
              ingredientId: item.ingredientId,
              name: item.name,
              imageUrl: item.imageUrl || '',
              imageFileId: item.imageFileId || ''
            })),
          ingredientInitials: itemIngredientIds
            .map((id) => pickIngredientInitial(id, ingredientMap))
            .filter(Boolean),
          suitableConditionIds: Array.isArray(item.suitableConditionIds)
            ? item.suitableConditionIds
            : [],
          pairingReason: item.pairingReason,
          cookingMethod: item.cookingMethod || '',
          cookingTime: item.cookingTime || ''
        }
      })

    const sources = sourcesRes.data
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item) => ({
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        sourceType: item.sourceType,
        organization: item.organization,
        version: item.version || '',
        publishYear: item.publishYear || '',
        reliabilityLevel: item.reliabilityLevel || ''
      }))

    return success({
      ingredient: {
        ingredientId: ingredientWithImage.ingredientId,
        name: ingredientWithImage.name,
        alias: ingredientWithImage.alias || [],
        category: ingredientWithImage.category,
        subCategory: ingredientWithImage.subCategory || '',
        imageUrl: ingredientWithImage.imageUrl || '',
        imageFileId: ingredientWithImage.imageFileId || '',
        shortDescription: ingredientWithImage.shortDescription,
        nutrition: ingredientWithImage.nutrition || {},
        nutritionTags: ingredientWithImage.nutritionTags || [],
        sceneTags: ingredientWithImage.sceneTags || [],
        riskTags: ingredientWithImage.riskTags || [],
        cautions: ingredientWithImage.cautions || [],
        disclaimer: ingredientWithImage.disclaimer || '内容仅供日常饮食参考，不替代医生诊断或治疗。'
      },
      conditions,
      pairings,
      sources
    })
  } catch (error) {
    console.error('[getIngredientDetail] query failed', error)
    return fail(50001, '数据库查询失败')
  }
}
