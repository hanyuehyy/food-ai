const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockGet, mockAdd, mockUpdate, mockWhere, mockLimit, mockDoc } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockWhere.mockReturnThis()
  mockLimit.mockReturnThis()
  mockGet.mockResolvedValue({ data: [] })
  mockAdd.mockResolvedValue({ _id: 'mock-id' })
  mockUpdate.mockResolvedValue({ stats: { updated: 1 } })
  mockDoc.mockReturnValue({
    get: mockGet,
    update: mockUpdate
  })
})

describe('importKnowledgeData', () => {
  test('无效 collectionName 返回错误', async () => {
    const result = await main({
      collectionName: 'invalid_collection',
      data: [{ id: '1' }],
      mode: 'append'
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe(40001)
    expect(result.message).toContain('允许导入')
  })

  test('data 不是数组返回错误', async () => {
    const result = await main({
      collectionName: 'ingredients',
      data: 'not-an-array',
      mode: 'append'
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe(40001)
    expect(result.message).toContain('数组')
  })

  test('无效 mode 返回错误', async () => {
    const result = await main({
      collectionName: 'ingredients',
      data: [],
      mode: 'invalid'
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe(40001)
    expect(result.message).toContain('append')
  })

  test('append 模式：追加数据', async () => {
    const result = await main({
      collectionName: 'ingredients',
      data: [
        { ingredientId: 'tomato', name: '番茄' },
        { ingredientId: 'egg', name: '鸡蛋' }
      ],
      mode: 'append'
    })

    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(2)
    expect(result.data.updated).toBe(0)
    expect(result.data.failed).toBe(0)
    expect(mockAdd).toHaveBeenCalledTimes(2)
  })

  test('upsert 模式：新数据插入', async () => {
    mockGet.mockResolvedValue({ data: [] }) // 不存在

    const result = await main({
      collectionName: 'ingredients',
      data: [{ ingredientId: 'new_item', name: '新食材' }],
      mode: 'upsert'
    })

    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(1)
    expect(result.data.updated).toBe(0)
  })

  test('upsert 模式：已有数据更新', async () => {
    mockGet.mockResolvedValue({
      data: [{ _id: 'existing-id', ingredientId: 'tomato' }]
    })

    const result = await main({
      collectionName: 'ingredients',
      data: [{ ingredientId: 'tomato', name: '番茄更新' }],
      mode: 'upsert'
    })

    expect(result.success).toBe(true)
    expect(result.data.updated).toBe(1)
    expect(result.data.inserted).toBe(0)
  })

  test('缺少业务唯一字段时记录失败', async () => {
    const result = await main({
      collectionName: 'ingredients',
      data: [{ name: '没有ID的食材' }],
      mode: 'append'
    })

    expect(result.success).toBe(true)
    expect(result.data.failed).toBe(1)
    expect(result.data.errors[0].message).toContain('ingredientId')
  })

  test('tag_dicts 使用复合主键', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({
      collectionName: 'tag_dicts',
      data: [{ tagId: 't1', tagType: 'nutrition', name: '维生素C' }],
      mode: 'upsert'
    })

    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(1)
  })

  test('空数据数组返回成功', async () => {
    const result = await main({
      collectionName: 'ingredients',
      data: [],
      mode: 'append'
    })

    expect(result.success).toBe(true)
    expect(result.data.total).toBe(0)
    expect(result.data.inserted).toBe(0)
  })

  test('默认 mode 为 upsert', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({
      collectionName: 'ingredients',
      data: [{ ingredientId: 'test', name: '测试' }]
    })

    expect(result.success).toBe(true)
    expect(result.data.mode).toBe('upsert')
  })
})
