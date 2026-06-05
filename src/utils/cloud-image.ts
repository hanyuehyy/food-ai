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
  const sources = [item.imageUrl, item.imageFileId]

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

export async function resolveCloudImageSources<T extends CloudImageItem>(list: T[]) {
  const directMap: Record<string, string> = {}
  const unresolved: T[] = []

  for (const item of list) {
    const direct = resolveDirectSource(item)
    if (direct) {
      directMap[item.ingredientId] = direct
    } else {
      unresolved.push(item)
    }
  }

  if (!unresolved.length) {
    return directMap
  }

  const cloudSourceMap = unresolved.reduce<Record<string, string>>((map, item) => {
    const fileId = resolveCloudFileId(item)
    if (fileId) {
      map[item.ingredientId] = fileId
    }
    return map
  }, {})

  const cloudFileIds = [...new Set(Object.values(cloudSourceMap))]

  if (!cloudFileIds.length) {
    return directMap
  }

  try {
    const cloud = wx.cloud
    if (!cloud?.getTempFileURL) {
      return directMap
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

    for (const item of unresolved) {
      const cloudSource = cloudSourceMap[item.ingredientId] || ''
      const resolved = tempUrlMap[cloudSource]
      if (resolved) {
        directMap[item.ingredientId] = resolved
      }
    }

    return directMap
  } catch (error) {
    console.warn('[cloud-image] resolve temp urls failed', error)
    return directMap
  }
}
