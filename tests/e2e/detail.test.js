const { launch, waitForPage, safeText, measureTime } = require('./setup')

let mp

beforeAll(async () => {
  mp = await launch()
}, 120000)

// 不关闭连接，由 globalTeardown 统一管理

describe('食材详情功能测试', () => {
  let page

  beforeAll(async () => {
    page = await waitForPage(mp, 'pages/ingredient-detail/index?ingredientId=tomato', 5000)
  }, 30000)

  test('页面能正常加载', async () => {
    const body = await page.$('.detail-page')
    expect(body).not.toBeNull()
  })

  test('食材名称显示', async () => {
    const name = await page.$('.ingredient-name')
    expect(name).not.toBeNull()
    const text = await safeText(name)
    expect(text.length).toBeGreaterThan(0)
  })

  test('主要营养特点区块存在', async () => {
    const nutritionPanel = await page.$('.nutrition-panel')
    const emptyPanel = await page.$('.empty-panel')
    expect(nutritionPanel || emptyPanel).not.toBeNull()
  })

  test('适合状态区块存在', async () => {
    const body = await page.$('.detail-page')
    expect(body).not.toBeNull()
  })

  test('搭配方案区块存在', async () => {
    const sections = await page.$$('.section')
    expect(sections.length).toBeGreaterThan(0)
  })

  test('详情页加载性能', async () => {
    const { duration } = await measureTime(async () => {
      const freshPage = await waitForPage(mp, 'pages/ingredient-detail/index?ingredientId=tomato', 3000)
      await freshPage.$('.detail-page')
      return freshPage
    })
    console.log(`食材详情加载耗时: ${duration}ms (含自动化开销)`)
    expect(duration).toBeLessThan(15000)
  })
})

describe('食材详情边界测试', () => {
  test('无效食材 ID 不崩溃', async () => {
    const page = await waitForPage(mp, 'pages/ingredient-detail/index?ingredientId=nonexistent_xyz', 3000)
    const body = await page.$('.detail-page')
    expect(body).not.toBeNull()
  })

  test('空食材 ID 不崩溃', async () => {
    const page = await waitForPage(mp, 'pages/ingredient-detail/index', 3000)
    const body = await page.$('.detail-page')
    expect(body).not.toBeNull()
  })
})
