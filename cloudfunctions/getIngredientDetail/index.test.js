const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockGet, mockWhere, mockLimit, mockField, mockCollection, db } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockWhere.mockReturnThis()
  mockLimit.mockReturnThis()
  mockField.mockReturnThis()
  mockGet.mockResolvedValue({ data: [] })
})

describe('getIngredientDetail', () => {
  test('缺少 ingredientId 时返回错误', async () => {
    const result = await main({})

    expect(result.success).toBe(false)
    expect(result.code).toBe(40001)
    expect(result.message).toContain('食材 ID')
  })

  test('空字符串 ingredientId 返回错误', async () => {
    const result = await main({ ingredientId: '  ' })

    expect(result.success).toBe(false)
    expect(result.code).toBe(40001)
  })

  test('食材不存在时返回 404', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })

    const result = await main({ ingredientId: 'nonexistent' })

    expect(result.success).toBe(false)
    expect(result.code).toBe(40401)
  })

  test('正常返回食材详情', async () => {
    const ingredient = {
      ingredientId: 'tomato',
      name: '番茄',
      alias: ['西红柿'],
      category: '蔬菜',
      shortDescription: '富含番茄红素',
      nutrition: { calories: 18 },
      nutritionTags: ['维生素C'],
      sceneTags: [],
      riskTags: [],
      cautions: [],
      suitableConditionIds: ['staying_up_late'],
      sourceIds: ['source1']
    }

    // First call: get ingredient
    mockGet.mockResolvedValueOnce({ data: [ingredient] })

    // Second call batch: conditions, pairings, sources
    mockGet.mockResolvedValueOnce({
      data: [{ conditionId: 'staying_up_late', conditionName: '熬夜', iconName: 'moon', userDescription: '经常熬夜' }]
    })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({
      data: [{ sourceId: 'source1', sourceName: '中国食物成分表', sourceType: 'book' }]
    })

    const result = await main({ ingredientId: 'tomato' })

    expect(result.success).toBe(true)
    expect(result.data.ingredient.ingredientId).toBe('tomato')
    expect(result.data.ingredient.name).toBe('番茄')
    expect(result.data.conditions).toHaveLength(1)
    expect(result.data.sources).toHaveLength(1)
  })

  test('无搭配和来源时返回空数组', async () => {
    const ingredient = {
      ingredientId: 'tomato',
      name: '番茄',
      category: '蔬菜',
      suitableConditionIds: [],
      sourceIds: []
    }

    mockGet.mockResolvedValueOnce({ data: [ingredient] })
    mockGet.mockResolvedValueOnce({ data: [] }) // pairings
    mockGet.mockResolvedValueOnce({ data: [] }) // pairing ingredients

    const result = await main({ ingredientId: 'tomato' })

    expect(result.success).toBe(true)
    expect(result.data.pairings).toEqual([])
    expect(result.data.sources).toEqual([])
  })

  test('数据库查询失败时返回错误', async () => {
    mockGet.mockReset()
    mockGet.mockRejectedValue(new Error('db error'))

    const result = await main({ ingredientId: 'tomato' })

    expect(result.success).toBe(false)
    expect(result.code).toBe(50001)
  })
})
