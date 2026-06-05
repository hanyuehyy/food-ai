const cloud = require('wx-server-sdk')
const { success, fail, resolveIngredientImageUrls, escapeRegExp } = require('./utils')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function normalizePagination(event) {
  const page = Math.max(Number(event.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 50)

  return {
    page,
    pageSize
  }
}

function buildWhere(keyword, category, conditionId) {
  const _ = db.command
  const conditions = [{ status: 'published' }]

  if (category) {
    conditions.push({ category })
  }
  if (conditionId) {
    conditions.push({ suitableConditionIds: conditionId })
  }
  if (keyword) {
    const safe = escapeRegExp(keyword)
    const re = db.RegExp({ regexp: safe, options: 'i' })
    conditions.push(_.or([
      { name: re },
      { alias: re }
    ]))
  }

  return conditions.length === 1 ? conditions[0] : _.and(conditions)
}

exports.main = async (event = {}) => {
  const { page, pageSize } = normalizePagination(event)
  const keyword = String(event.keyword || '').trim().toLowerCase()
  const category = String(event.category || '').trim()
  const conditionId = String(event.conditionId || '').trim()

  try {
    const where = buildWhere(keyword, category, conditionId)
    const skip = (page - 1) * pageSize
    const fields = {
      ingredientId: true,
      name: true,
      alias: true,
      category: true,
      subCategory: true,
      imageUrl: true,
      imageFileId: true,
      shortDescription: true,
      nutritionTags: true,
      riskTags: true,
      searchKeywords: true
    }

    const [listRes, countRes] = await Promise.all([
      db.collection('ingredients')
        .where(where)
        .orderBy('sortOrder', 'asc')
        .skip(skip)
        .limit(pageSize)
        .field(fields)
        .get(),
      db.collection('ingredients')
        .where(where)
        .count()
    ])

    const total = countRes.total
    const list = await resolveIngredientImageUrls(listRes.data)

    return success({
      list,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: skip + pageSize < total
      }
    })
  } catch (error) {
    console.error('[getIngredientList] query failed', error)
    return fail(50001, '数据库查询失败')
  }
}
