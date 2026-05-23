const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const ALLOWED_COLLECTIONS = [
  'ingredients',
  'body_conditions',
  'condition_ingredient_rules',
  'ingredient_pairings',
  'knowledge_sources',
  'tag_dicts',
  'system_configs'
]

const BUSINESS_KEYS = {
  ingredients: ['ingredientId'],
  body_conditions: ['conditionId'],
  condition_ingredient_rules: ['ruleId'],
  ingredient_pairings: ['pairingId'],
  knowledge_sources: ['sourceId'],
  tag_dicts: ['tagId', 'tagType'],
  system_configs: ['configKey']
}

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

function buildWhere(collectionName, item) {
  const keys = BUSINESS_KEYS[collectionName]
  return keys.reduce((where, key) => {
    where[key] = item[key]
    return where
  }, {})
}

function getBusinessId(collectionName, item) {
  return BUSINESS_KEYS[collectionName].map((key) => item[key]).join(':')
}

function validateItem(collectionName, item) {
  const missingKey = BUSINESS_KEYS[collectionName].find((key) => !item[key])
  if (missingKey) {
    return `缺少业务唯一字段 ${missingKey}`
  }

  return ''
}

exports.main = async (event = {}) => {
  const { collectionName, data, mode = 'upsert' } = event

  if (!ALLOWED_COLLECTIONS.includes(collectionName)) {
    return fail(40001, 'collectionName 不在允许导入范围内')
  }

  if (!Array.isArray(data)) {
    return fail(40001, 'data 必须是数组')
  }

  if (!['append', 'upsert'].includes(mode)) {
    return fail(40001, 'mode 仅支持 append 或 upsert')
  }

  const result = {
    collectionName,
    mode,
    total: data.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  }

  const collection = db.collection(collectionName)

  for (let index = 0; index < data.length; index += 1) {
    const item = {
      ...data[index],
      updatedAt: db.serverDate()
    }
    const businessId = getBusinessId(collectionName, item)
    const validationMessage = validateItem(collectionName, item)

    if (validationMessage) {
      result.failed += 1
      result.errors.push({ index, businessId, message: validationMessage })
      continue
    }

    try {
      delete item._id

      if (mode === 'append') {
        await collection.add({
          data: {
            ...item,
            createdAt: item.createdAt || db.serverDate()
          }
        })
        result.inserted += 1
        continue
      }

      const existed = await collection.where(buildWhere(collectionName, item)).limit(1).get()

      if (existed.data.length > 0) {
        await collection.doc(existed.data[0]._id).update({
          data: item
        })
        result.updated += 1
      } else {
        await collection.add({
          data: {
            ...item,
            createdAt: item.createdAt || db.serverDate()
          }
        })
        result.inserted += 1
      }
    } catch (error) {
      result.failed += 1
      result.errors.push({
        index,
        businessId,
        message: error.message || '数据导入失败'
      })
    }
  }

  return success(result)
}
