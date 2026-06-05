const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockGet, mockWhere, mockOrderBy, mockLimit, mockField, mockCollection, db } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockWhere.mockReturnThis()
  mockOrderBy.mockReturnThis()
  mockLimit.mockReturnThis()
  mockField.mockReturnThis()
  mockGet.mockResolvedValue({ data: [] })
})

describe('getHomeData', () => {
  test('正常返回首页数据结构', async () => {
    // body_conditions
    mockGet.mockResolvedValueOnce({
      data: [{ conditionId: 'staying_up_late', conditionName: '熬夜', iconFileId: '', userDescription: '常熬夜' }]
    })
    // ingredients (recommend)
    mockGet.mockResolvedValueOnce({
      data: [{ ingredientId: 'tomato', name: '番茄', category: '蔬菜', imageUrl: '', imageFileId: '' }]
    })
    // pairings
    mockGet.mockResolvedValueOnce({
      data: [{ pairingId: 'p1', pairingName: '番茄炒蛋', ingredientIds: ['tomato', 'egg'], pairingReason: '营养互补' }]
    })
    // system_configs
    mockGet.mockResolvedValueOnce({
      data: [
        { configKey: 'home_search_placeholder', configValue: '搜索食材' },
        { configKey: 'global_disclaimer', configValue: '仅供参考' }
      ]
    })

    const result = await main({})

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('conditions')
    expect(result.data).toHaveProperty('recommendIngredients')
    expect(result.data).toHaveProperty('recommendPairings')
    expect(result.data).toHaveProperty('configs')
    expect(result.data.configs.searchPlaceholder).toBe('搜索食材')
    expect(result.data.configs.globalDisclaimer).toBe('仅供参考')
  })

  test('conditions 按 sortOrder 排序', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { conditionId: 'a', conditionName: 'A', sortOrder: 2 },
        { conditionId: 'b', conditionName: 'B', sortOrder: 1 }
      ]
    })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })

    const result = await main({})

    expect(result.data.conditions[0].conditionId).toBe('a')
    expect(result.data.conditions[1].conditionId).toBe('b')
  })

  test('recommendIngredients 限制 6 个', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({
      data: Array.from({ length: 6 }, (_, i) => ({
        ingredientId: `item${i}`, name: `食材${i}`, category: '蔬菜'
      }))
    })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })

    await main({})

    expect(mockLimit).toHaveBeenCalledWith(6)
  })

  test('recommendPairings 限制 3 个', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })

    await main({})

    // Second limit call should be for pairings (limit 3)
    const limitCalls = mockLimit.mock.calls
    expect(limitCalls).toContainEqual([3])
  })

  test('configs 使用默认值', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })

    const result = await main({})

    expect(result.data.configs.searchPlaceholder).toBe('搜索食材，比如 鸡蛋、番茄、苹果')
    expect(result.data.configs.globalDisclaimer).toBe('内容仅供日常饮食参考，不替代医生诊断或治疗。')
  })

  test('province 参数传递给时令查询', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    mockGet.mockResolvedValueOnce({ data: [] })
    // region_mappings query for province
    mockGet.mockResolvedValueOnce({ data: [] })

    const result = await main({ province: '广东' })

    expect(result.success).toBe(true)
    expect(result.data.monthlySeasonal).toBeNull()
  })

  test('数据库查询失败时返回错误', async () => {
    mockGet.mockRejectedValue(new Error('db error'))

    const result = await main({})

    expect(result.success).toBe(false)
    expect(result.code).toBe(50001)
  })
})
