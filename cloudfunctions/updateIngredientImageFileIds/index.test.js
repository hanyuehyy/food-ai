const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockGet, mockUpdate, mockWhere, mockLimit, mockField, mockDoc } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockWhere.mockReturnThis()
  mockLimit.mockReturnThis()
  mockField.mockReturnThis()
  mockGet.mockResolvedValue({ data: [] })
  mockUpdate.mockResolvedValue({ stats: { updated: 1 } })
  mockDoc.mockReturnValue({
    update: mockUpdate
  })
})

describe('updateIngredientImageFileIds', () => {
  const FILE_ID_PREFIX = 'cloud://cloud1-4g4br868e4d093c0.636c-cloud1-4g4br868e4d093c0-1320667469'

  test('dryRun 模式（默认）不执行实际更新', async () => {
    mockGet.mockResolvedValue({
      data: [
        { _id: 'id1', ingredientId: 'tomato', name: '番茄', imageName: 'old.png', imageFileId: 'old-id' }
      ]
    })

    const result = await main({})

    expect(result.success).toBe(true)
    expect(result.data.dryRun).toBe(true)
    expect(result.data.updated).toBe(1)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  test('dryRun: false 时执行实际更新', async () => {
    mockGet.mockResolvedValue({
      data: [
        { _id: 'id1', ingredientId: 'tomato', name: '番茄', imageName: 'old.png', imageFileId: 'old-id' }
      ]
    })

    const result = await main({ dryRun: false })

    expect(result.success).toBe(true)
    expect(result.data.dryRun).toBe(false)
    expect(mockUpdate).toHaveBeenCalled()
  })

  test('生成正确的图片文件名', async () => {
    mockGet.mockResolvedValue({
      data: [
        { _id: 'id1', ingredientId: 'tomato', name: '番茄', imageName: '', imageFileId: '' }
      ]
    })

    const result = await main({})

    const item = result.data.items[0]
    expect(item.after.imageName).toBe('food-tomato.png')
    expect(item.after.imageFileId).toBe(`${FILE_ID_PREFIX}/food-tomato.png`)
  })

  test('IMAGE_NAME_OVERRIDES 生效', async () => {
    mockGet.mockResolvedValue({
      data: [
        { _id: 'id1', ingredientId: 'waxberry', name: '杨梅', imageName: '', imageFileId: '' }
      ]
    })

    const result = await main({})

    const item = result.data.items[0]
    expect(item.after.imageName).toBe('food-bayberry.png')
  })

  test('下划线替换为连字符', async () => {
    mockGet.mockResolvedValue({
      data: [
        { _id: 'id1', ingredientId: 'spring_bamboo_shoots', name: '春笋', imageName: '', imageFileId: '' }
      ]
    })

    const result = await main({})

    // spring_bamboo_shoots is in overrides
    const item = result.data.items[0]
    expect(item.after.imageName).toBe('food-spring-bamboo-shoot.png')
  })

  test('未变化的食材标记为 skipped', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          _id: 'id1',
          ingredientId: 'tomato',
          name: '番茄',
          imageName: 'food-tomato.png',
          imageFileId: `${FILE_ID_PREFIX}/food-tomato.png`
        }
      ]
    })

    const result = await main({})

    expect(result.data.skipped).toBe(1)
    expect(result.data.updated).toBe(0)
  })

  test('缺少 ingredientId 时记录失败', async () => {
    mockGet.mockResolvedValue({
      data: [
        { _id: 'id1', name: '未知食材' }
      ]
    })

    const result = await main({})

    expect(result.data.failed).toBe(1)
    expect(result.data.errors[0].message).toContain('ingredientId')
  })

  test('数据库查询失败时返回错误', async () => {
    mockGet.mockRejectedValue(new Error('db error'))

    const result = await main({})

    expect(result.success).toBe(false)
    expect(result.code).toBe(50001)
  })
})
