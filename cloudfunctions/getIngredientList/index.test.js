const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockGet, mockCount, mockWhere, mockOrderBy, mockSkip, mockLimit, mockField } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockWhere.mockReturnThis()
  mockOrderBy.mockReturnThis()
  mockSkip.mockReturnThis()
  mockLimit.mockReturnThis()
  mockField.mockReturnThis()
  mockGet.mockResolvedValue({ data: [] })
  mockCount.mockResolvedValue({ total: 0 })
})

describe('getIngredientList', () => {
  test('默认分页参数', async () => {
    mockGet.mockResolvedValue({ data: [] })
    mockCount.mockResolvedValue({ total: 0 })

    const result = await main({})

    expect(result.success).toBe(true)
    expect(result.data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false
    })
  })

  test('自定义分页参数', async () => {
    mockGet.mockResolvedValue({
      data: [{ ingredientId: 'tomato', name: '番茄' }]
    })
    mockCount.mockResolvedValue({ total: 50 })

    const result = await main({ page: 2, pageSize: 10 })

    expect(result.data.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 50,
      hasMore: true
    })
    expect(mockSkip).toHaveBeenCalledWith(10)
    expect(mockLimit).toHaveBeenCalledWith(10)
  })

  test('pageSize 超过 50 时限制为 50', async () => {
    await main({ pageSize: 100 })

    expect(mockLimit).toHaveBeenCalledWith(50)
  })

  test('page 小于 1 时修正为 1', async () => {
    await main({ page: -1 })

    expect(mockSkip).toHaveBeenCalledWith(0)
  })

  test('关键词搜索使用 RegExp', async () => {
    mockGet.mockResolvedValue({ data: [] })
    mockCount.mockResolvedValue({ total: 0 })

    await main({ keyword: '番茄' })

    expect(mockWhere).toHaveBeenCalled()
  })

  test('按分类筛选', async () => {
    await main({ category: '蔬菜' })

    expect(mockWhere).toHaveBeenCalled()
  })

  test('按体质筛选', async () => {
    await main({ conditionId: 'staying_up_late' })

    expect(mockWhere).toHaveBeenCalled()
  })

  test('数据库查询失败时返回错误', async () => {
    mockGet.mockRejectedValue(new Error('db error'))

    const result = await main({})

    expect(result.success).toBe(false)
    expect(result.code).toBe(50001)
  })

  test('hasMore 在最后一页为 false', async () => {
    mockGet.mockResolvedValue({
      data: [{ ingredientId: 'tomato', name: '番茄' }]
    })
    mockCount.mockResolvedValue({ total: 5 })

    const result = await main({ page: 1, pageSize: 10 })

    expect(result.data.pagination.hasMore).toBe(false)
  })
})
