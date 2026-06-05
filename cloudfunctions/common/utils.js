const cloud = require('wx-server-sdk')

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

async function resolveIngredientImageUrls(ingredients, logPrefix = 'common') {
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
        console.warn(`[${logPrefix}] resolve image temp url failed`, {
          fileID: file.fileID || cloudFileIds[index],
          status: file.status,
          errMsg: file.errMsg
        })
      }
    })
  } catch (error) {
    console.error(`[${logPrefix}] getTempFileURL failed`, error)
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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = {
  success,
  fail,
  getCloudImageFileId,
  getDirectImageUrl,
  resolveIngredientImageUrls,
  escapeRegExp
}
