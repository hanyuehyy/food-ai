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

function fail(code, message, data = null) {
  return {
    success: false,
    code,
    message,
    data
  }
}

function normalizePagination(event) {
  const page = Math.max(Number(event.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 50)

  return {
    page,
    pageSize
  }
}

function matchKeyword(item, keyword) {
  if (!keyword) {
    return true
  }

  const fields = [
    item.name,
    item.category,
    item.subCategory,
    item.shortDescription,
    ...(Array.isArray(item.alias) ? item.alias : []),
    ...(Array.isArray(item.searchKeywords) ? item.searchKeywords : [])
  ]

  return fields.some((field) => String(field || '').toLowerCase().includes(keyword))
}

function getCloudImageFileId(item) {
  const sources = [item.imageFileId, item.imageUrl]

  for (const source of sources) {
    const fileId = (source || '').trim()
    if (fileId.startsWith('cloud://')) {
      return fileId
    }
  }

  return ''
}

function getDirectImageUrl(item) {
  const imageUrl = (item.imageUrl || '').trim()
  return imageUrl && !imageUrl.startsWith('cloud://') ? imageUrl : ''
}

async function resolveIngredientImageUrls(ingredients) {
  const cloudFileIds = [
    ...new Set(
      ingredients
        .map((item) => getCloudImageFileId(item))
        .filter(Boolean)
    )
  ]

  if (!cloudFileIds.length) {
    return ingredients.map((item) => ({
      ...item,
      imageUrl: getDirectImageUrl(item)
    }))
  }

  const tempUrlMap = {}

  try {
    const res = await cloud.getTempFileURL({
      fileList: cloudFileIds
    })

    ;(res.fileList || []).forEach((file, index) => {
      if (file.status === 0 && file.tempFileURL) {
        tempUrlMap[file.fileID || cloudFileIds[index]] = file.tempFileURL
        tempUrlMap[cloudFileIds[index]] = file.tempFileURL
      } else {
        console.warn('[getIngredientList] resolve image temp url failed', {
          fileID: file.fileID || cloudFileIds[index],
          status: file.status,
          errMsg: file.errMsg
        })
      }
    })
  } catch (error) {
    console.error('[getIngredientList] getTempFileURL failed', error)
  }

  return ingredients.map((item) => {
    const directImageUrl = getDirectImageUrl(item)
    const cloudFileId = getCloudImageFileId(item)

    return {
      ...item,
      imageUrl: directImageUrl || tempUrlMap[cloudFileId] || ''
    }
  })
}

exports.main = async (event = {}) => {
  const { page, pageSize } = normalizePagination(event)
  const keyword = String(event.keyword || '').trim().toLowerCase()
  const category = String(event.category || '').trim()

  try {
    const where = { status: 'published' }
    if (category) {
      where.category = category
    }

    const res = await db.collection('ingredients')
      .where(where)
      .orderBy('sortOrder', 'asc')
      .limit(100)
      .field({
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
      })
      .get()

    const filtered = res.data.filter((item) => matchKeyword(item, keyword))
    const start = (page - 1) * pageSize
    const list = await resolveIngredientImageUrls(filtered.slice(start, start + pageSize))

    return success({
      list,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        hasMore: start + pageSize < filtered.length
      }
    })
  } catch (error) {
    console.error('[getIngredientList] query failed', error)
    return fail(50001, '数据库查询失败')
  }
}
