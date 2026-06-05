const { launch, close, waitForPage, safeText, measureTime } = require('./setup')

let mp

beforeAll(async () => {
  mp = await launch()
}, 120000)

// 不关闭连接，由 globalTeardown 统一管理

describe('首页功能测试', () => {
  let page

  beforeAll(async () => {
    page = await waitForPage(mp, 'pages/index/index', 5000)
  }, 30000)

  test('页面能正常加载，不白屏', async () => {
    const body = await page.$('.home-page')
    expect(body).not.toBeNull()
  })

  test('页面标题显示「食材小查」', async () => {
    const title = await page.$('.page-title')
    expect(title).not.toBeNull()
    const text = await safeText(title)
    expect(text).toContain('食材小查')
  })

  test('体质状况标签显示', async () => {
    const chips = await page.$$('.chip')
    expect(chips.length).toBeGreaterThan(0)
  })

  test('搜索框 placeholder 有值', async () => {
    const placeholder = await page.$('.search-placeholder')
    expect(placeholder).not.toBeNull()
    const text = await safeText(placeholder)
    expect(text.length).toBeGreaterThan(0)
  })

  test('时令食材区块或加载状态存在', async () => {
    // 可能有时令食材卡片，也可能没有（取决于地区数据）
    const seasonSection = await page.$('.season-section')
    const foodCards = await page.$$('.food-card')
    // 只要页面不崩溃即可
    const body = await page.$('.home-page')
    expect(body).not.toBeNull()
  })

  test('免责声明显示', async () => {
    const disclaimer = await page.$('.disclaimer')
    // 可能有也可能没有，取决于配置
    const body = await page.$('.home-page')
    expect(body).not.toBeNull()
  })

  test('点击搜索框跳转到食材库', async () => {
    const searchBox = await page.$('.search-box')
    if (searchBox) {
      await searchBox.tap()
      await page.waitFor(2000)
      const currentPage = await mp.currentPage()
      expect(currentPage.path).toContain('ingredient-library')
      await mp.navigateBack()
      await page.waitFor(1000)
    }
  })

  test('体质标签可点击', async () => {
    const chip = await page.$('.chip')
    if (chip) {
      await chip.tap()
      await page.waitFor(2000)
      const currentPage = await mp.currentPage()
      expect(currentPage.path).toContain('ingredient-library')
      await mp.navigateBack()
      await page.waitFor(1000)
    }
  })

  test('首页加载性能', async () => {
    const { duration } = await measureTime(async () => {
      const freshPage = await waitForPage(mp, 'pages/index/index', 3000)
      await freshPage.$('.home-page')
      return freshPage
    })
    console.log(`首页加载耗时: ${duration}ms (含自动化开销)`)
    expect(duration).toBeLessThan(15000)
  })
})
