const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const FILE_ID_PREFIX = 'cloud://cloud1-4g4br868e4d093c0.636c-cloud1-4g4br868e4d093c0-1320667469'

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

function buildImageFields(ingredientId) {
  const imageName = `food-${ingredientId}.png`

  return {
    imageName,
    imageFileId: `${FILE_ID_PREFIX}/${imageName}`
  }
}

exports.main = async (event = {}) => {
  const dryRun = event.dryRun !== false

  try {
    const res = await db.collection('ingredients')
      .where({})
      .limit(100)
      .field({
        _id: true,
        ingredientId: true,
        name: true,
        imageName: true,
        imageFileId: true
      })
      .get()

    const result = {
      dryRun,
      total: res.data.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      items: [],
      errors: []
    }

    for (const item of res.data) {
      if (!item.ingredientId) {
        result.failed += 1
        result.errors.push({
          _id: item._id,
          message: '缺少 ingredientId'
        })
        continue
      }

      const nextFields = buildImageFields(item.ingredientId)
      const changed = item.imageName !== nextFields.imageName || item.imageFileId !== nextFields.imageFileId

      result.items.push({
        ingredientId: item.ingredientId,
        name: item.name,
        before: {
          imageName: item.imageName || '',
          imageFileId: item.imageFileId || ''
        },
        after: nextFields,
        changed
      })

      if (!changed) {
        result.skipped += 1
        continue
      }

      if (dryRun) {
        result.updated += 1
        continue
      }

      try {
        await db.collection('ingredients').doc(item._id).update({
          data: {
            ...nextFields,
            updatedAt: db.serverDate()
          }
        })
        result.updated += 1
      } catch (error) {
        result.failed += 1
        result.errors.push({
          ingredientId: item.ingredientId,
          message: error.message || '更新失败'
        })
      }
    }

    return success(result)
  } catch (error) {
    console.error('[updateIngredientImageFileIds] failed', error)
    return fail(50001, '批量更新食材图片 fileID 失败', {
      message: error.message || String(error)
    })
  }
}
