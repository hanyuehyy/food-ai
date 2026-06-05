const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockGet, mockWhere, mockField, mockLimit } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockWhere.mockReturnThis()
  mockField.mockReturnThis()
  mockLimit.mockReturnThis()
  mockGet.mockResolvedValue({ data: [] })
})

describe('getIngredientCategories', () => {
  test('返回去重排序后的分类列表', async () => {
    mockGet.mockResolvedValue({
      data: [
        { category: '蔬菜' },
        { category: '水果' },
        { category: '蔬菜' },
        { category: '肉类' },
        { category: '' },
        { category: null }
      ]
    })

    const result = await main()

    expect(result.success).toBe(true)
    expect(result.data.categories).toEqual(['水果', '肉类', '蔬菜'])
  })

  test('无数据时返回空数组', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main()

    expect(result.success).toBe(true)
    expect(result.data.categories).toEqual([])
  })

  test('数据库查询失败时返回错误', async () => {
    mockGet.mockRejectedValue(new Error('db error'))

    const result = await main()

    expect(result.success).toBe(false)
    expect(result.code).toBe(50001)
  })

  test('查询条件包含 status: published', async () => {
    mockGet.mockResolvedValue({ data: [{ category: '蔬菜' }] })

    await main()

    expect(mockWhere).toHaveBeenCalledWith({ status: 'published' })
  })
})
