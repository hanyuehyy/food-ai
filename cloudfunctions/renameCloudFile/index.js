const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const FILE_ID_PREFIX = 'cloud://cloud1-4g4br868e4d093c0.636c-cloud1-4g4br868e4d093c0-1320667469'

exports.main = async () => {
  const oldName = 'food-yangmei.png'
  const newName = 'food-bayberry.png'
  const oldFileID = `${FILE_ID_PREFIX}/${oldName}`
  const newFileID = `${FILE_ID_PREFIX}/${newName}`

  try {
    // 1. 下载旧文件
    const downloadRes = await cloud.downloadFile({
      fileID: oldFileID
    })

    // 2. 以新文件名上传
    await cloud.uploadFile({
      cloudPath: newName,
      fileContent: downloadRes.fileContent
    })

    // 3. 删除旧文件
    await cloud.deleteFile({
      fileList: [oldFileID]
    })

    // 4. 更新数据库中 bayberry 食材的引用
    const updateRes = await db.collection('ingredients')
      .where({ ingredientId: 'bayberry' })
      .update({
        data: {
          imageName: newName,
          imageFileId: newFileID,
          updatedAt: db.serverDate()
        }
      })

    return {
      success: true,
      data: {
        oldFileID,
        newFileID,
        dbUpdated: updateRes.stats.updated
      }
    }
  } catch (error) {
    console.error('[renameCloudFile] failed', error)
    return {
      success: false,
      message: error.message || String(error)
    }
  }
}
