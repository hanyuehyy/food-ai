const cloud = require('wx-server-sdk')
const { main } = require('./index')

const { mockAdd, mockCollection, mockServerDate } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
  mockAdd.mockResolvedValue({ _id: 'mock-id' })
  mockServerDate.mockReturnValue(new Date('2026-05-29T00:00:00Z'))
})

describe('logAnalyticsEvent', () => {
  test('批量写入事件到 analytics_events 集合', async () => {
    const events = [
      { eventType: 'page_view', page: 'home', params: {}, timestamp: 1000 },
      { eventType: 'home_search_click', page: 'home', params: {}, timestamp: 2000 }
    ]

    const result = await main({ sessionId: 'test-session', events })

    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(2)
    expect(mockCollection).toHaveBeenCalledWith('analytics_events')
    expect(mockAdd).toHaveBeenCalledWith({
      data: {
        sessionId: 'test-session',
        events: [
          { eventType: 'page_view', page: 'home', params: {}, timestamp: 1000 },
          { eventType: 'home_search_click', page: 'home', params: {}, timestamp: 2000 }
        ],
        createdAt: new Date('2026-05-29T00:00:00Z')
      }
    })
  })

  test('空事件数组返回 inserted: 0', async () => {
    const result = await main({ sessionId: 'test-session', events: [] })

    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(0)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('无 events 字段返回 inserted: 0', async () => {
    const result = await main({ sessionId: 'test-session' })

    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(0)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('数据库写入失败时返回错误', async () => {
    mockAdd.mockRejectedValue(new Error('db error'))

    const events = [{ eventType: 'page_view', page: 'home', params: {}, timestamp: 1000 }]
    const result = await main({ sessionId: 'test-session', events })

    expect(result.success).toBe(false)
    expect(result.code).toBe(50001)
  })

  test('事件缺少可选字段时使用默认值', async () => {
    const events = [{ eventType: 'test_event' }]

    await main({ events })

    expect(mockAdd).toHaveBeenCalledWith({
      data: {
        sessionId: '',
        events: [
          { eventType: 'test_event', page: '', params: {}, timestamp: expect.any(Number) }
        ],
        createdAt: expect.any(Date)
      }
    })
  })
})
