const { launch, close, waitForPage, safeText, measureTime } = require('./setup')

let mp

beforeAll(async () => {
  mp = await launch()
}, 120000)

// 不关闭连接，由 globalTeardown 统一管理

describe('食材库功能测试', () => {
  let page

  beforeAll(async () => {
    page = await waitForPage(mp, 'pages/ingredient-library/index', 5000)
  }, 30000)

  test('页面能正常加载', async () => {
    const body = await page.$('.library-page')
    expect(body).not.toBeNull()
  })

  test('页面标题显示「食材库」', async () => {
    const title = await page.$('.section-title')
    expect(title).not.toBeNull()
    const text = await safeText(title)
    expect(text).toContain('食材库')
  })

  test('分类标签显示', async () => {
    const tabs = await page.$$('.tab')
    expect(tabs.length).toBeGreaterThan(0)
  })

  test('食材卡片列表显示', async () => {
    const cards = await page.$$('.card')
    expect(cards.length).toBeGreaterThan(0)
  })

  test('食材卡片包含名称', async () => {
    const firstName = await page.$('.card .name')
    expect(firstName).not.toBeNull()
    const text = await safeText(firstName)
    expect(text.length).toBeGreaterThan(0)
  })

  test('食材卡片包含分类', async () => {
    const firstCategory = await page.$('.card .category')
    expect(firstCategory).not.toBeNull()
    const text = await safeText(firstCategory)
    expect(text.length).toBeGreaterThan(0)
  })

  test('点击分类标签切换筛选', async () => {
    const tabs = await page.$$('.tab')
    if (tabs.length > 1) {
      const secondTab = tabs[1]
      const tabText = await safeText(secondTab)
      await secondTab.tap()
      await page.waitFor(2000)
      // 页面应该刷新
      const body = await page.$('.library-page')
      expect(body).not.toBeNull()
    }
  })

  test('点击食材卡片跳转详情页', async () => {
    const card = await page.$('.card')
    if (card) {
      await card.tap()
      await page.waitFor(2000)
      const currentPage = await mp.currentPage()
      expect(currentPage.path).toContain('ingredient-detail')
      await mp.navigateBack()
      await page.waitFor(1000)
    }
  })

  test('食材库加载性能', async () => {
    const { duration } = await measureTime(async () => {
      const freshPage = await waitForPage(mp, 'pages/ingredient-library/index', 3000)
      await freshPage.$$('.card')
      return freshPage
    })
    console.log(`食材库加载耗时: ${duration}ms (含自动化开销)`)
    expect(duration).toBeLessThan(15000)
  })
})
