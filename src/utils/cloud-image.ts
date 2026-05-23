import { CLOUD_ENV_ID } from '@/config/cloud'

export interface CloudImageItem {
  ingredientId: string
  imageUrl?: string
  imageFileId?: string
}

function normalizeCloudFileId(fileId: string) {
  const trimmedFileId = fileId.trim()

  if (trimmedFileId.startsWith('cloud://env-id')) {
    return trimmedFileId.replace('cloud://env-id', `cloud://${CLOUD_ENV_ID}`)
  }

  return trimmedFileId
}

function resolveCloudFileId(item: CloudImageItem) {
  const sources = [item.imageFileId, item.imageUrl]

  for (const source of sources) {
    const fileId = normalizeCloudFileId(source || '')
    if (fileId.startsWith('cloud://')) {
      return fileId
    }
  }

  return ''
}

function resolveDirectSource(item: CloudImageItem) {
  const sources = [item.imageUrl, item.imageFileId]

  for (const source of sources) {
    const directSource = (source || '').trim()
    if (directSource && !directSource.startsWith('cloud://')) {
      return directSource
    }
  }

  return ''
}

function resolveDirectSourceMap<T extends CloudImageItem>(list: T[]) {
  return list.reduce<Record<string, string>>((map, item) => {
    const directSource = resolveDirectSource(item)
    if (directSource) {
      map[item.ingredientId] = directSource
    }
    return map
  }, {})
}

export async function resolveCloudImageSources<T extends CloudImageItem>(list: T[]) {
  const cloudSourceMap = list.reduce<Record<string, string>>((map, item) => {
    const fileId = resolveCloudFileId(item)
    if (fileId) {
      map[item.ingredientId] = fileId
    }
    return map
  }, {})

  const cloudFileIds = [...new Set(Object.values(cloudSourceMap))]

  if (!cloudFileIds.length) {
    return resolveDirectSourceMap(list)
  }

  try {
    const cloud = wx.cloud
    if (!cloud?.getTempFileURL) {
      return resolveDirectSourceMap(list)
    }

    const res = await cloud.getTempFileURL({
      fileList: cloudFileIds
    })
    const tempUrlMap = res.fileList.reduce<Record<string, string>>((map, file, index) => {
      if (file.status === 0 && file.tempFileURL) {
        map[file.fileID || cloudFileIds[index]] = file.tempFileURL
        map[cloudFileIds[index]] = file.tempFileURL
      }
      return map
    }, {})

    return list.reduce<Record<string, string>>((map, item) => {
      const directSource = resolveDirectSource(item)
      const cloudSource = cloudSourceMap[item.ingredientId] || ''
      const resolvedSource = directSource || tempUrlMap[cloudSource] || ''
      if (resolvedSource) {
        map[item.ingredientId] = resolvedSource
      }
      return map
    }, {})
  } catch (error) {
    console.warn('[cloud-image] resolve temp urls failed', error)
    return list.reduce<Record<string, string>>((map, item) => {
      const directSource = resolveDirectSource(item)
      if (directSource) {
        map[item.ingredientId] = directSource
      }
      return map
    }, {})
  }
}
