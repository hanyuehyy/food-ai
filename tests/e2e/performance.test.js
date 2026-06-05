const { launch, close, waitForPage, measureTime } = require('./setup')

let mp

beforeAll(async () => {
  mp = await launch()
}, 120000)

// 不关闭连接，由 globalTeardown 统一管理

describe('性能测试', () => {
  const results = {}

  test('首页首次加载性能', async () => {
    const { duration } = await measureTime(async () => {
      const page = await waitForPage(mp, 'pages/index/index', 3000)
      await page.$('.home-page')
      return page
    })
    results.homeLoad = duration
    console.log(`[性能] 首页加载: ${duration}ms`)
    expect(duration).toBeLessThan(20000)
  }, 60000)

  test('食材库首次加载性能', async () => {
    const { duration } = await measureTime(async () => {
      const page = await waitForPage(mp, 'pages/ingredient-library/index', 3000)
      await page.$$('.card')
      return page
    })
    results.libraryLoad = duration
    console.log(`[性能] 食材库加载: ${duration}ms`)
    expect(duration).toBeLessThan(20000)
  }, 60000)

  test('食材详情加载性能', async () => {
    const { duration } = await measureTime(async () => {
      const page = await waitForPage(mp, 'pages/ingredient-detail/index?ingredientId=tomato', 3000)
      await page.$('.detail-page')
      return page
    })
    results.detailLoad = duration
    console.log(`[性能] 食材详情加载: ${duration}ms`)
    expect(duration).toBeLessThan(20000)
  }, 60000)

  test('页面切换性能', async () => {
    const { duration } = await measureTime(async () => {
      await waitForPage(mp, 'pages/index/index', 2000)
      await waitForPage(mp, 'pages/ingredient-library/index', 2000)
      await waitForPage(mp, 'pages/ingredient-detail/index?ingredientId=tomato', 2000)
      await waitForPage(mp, 'pages/index/index', 2000)
    })
    results.navigation = duration
    console.log(`[性能] 全链路导航: ${duration}ms`)
    expect(duration).toBeLessThan(60000)
  }, 90000)

  test('连续加载稳定性', async () => {
    const times = []
    for (let i = 0; i < 3; i++) {
      const { duration } = await measureTime(async () => {
        const page = await waitForPage(mp, 'pages/index/index', 2000)
        await page.$('.home-page')
      })
      times.push(duration)
    }
    results.stability = times
    console.log(`[性能] 连续加载耗时: ${times.join('ms, ')}ms`)

    if (times.length >= 2) {
      expect(times[times.length - 1]).toBeLessThan(times[0] * 3)
    }
  }, 60000)

  afterAll(() => {
    console.log('\n========== 性能测试结果汇总 ==========')
    console.log(`首页加载:       ${results.homeLoad}ms`)
    console.log(`食材库加载:     ${results.libraryLoad}ms`)
    console.log(`食材详情加载:   ${results.detailLoad}ms`)
    console.log(`全链路导航:     ${results.navigation}ms`)
    console.log(`连续加载稳定性: ${(results.stability || []).join('ms, ')}ms`)
    console.log('=======================================\n')
  })
})
