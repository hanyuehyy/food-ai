const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function success(data) {
  return {
    success: true,
    code: 0,
    message: 'success',
    data
  }
}

function fail(code, message) {
  return {
    success: false,
    code,
    message,
    data: null
  }
}

exports.main = async () => {
  try {
    const res = await db.collection('ingredients')
      .where({ status: 'published' })
      .field({ category: true })
      .limit(500)
      .get()

    const categories = [...new Set(
      res.data
        .map((item) => (item.category || '').trim())
        .filter(Boolean)
    )].sort()

    return success({ categories })
  } catch (error) {
    console.error('[getIngredientCategories] query failed', error)
    return fail(50001, '数据库查询失败')
  }
}
