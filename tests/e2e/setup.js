const automator = require('miniprogram-automator')
const path = require('path')

const CLI_PATH = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PROJECT_PATH = path.resolve(__dirname, '../../dist/dev/mp-weixin')
const TIMEOUT = 60000

// 全局共享的连接实例
let sharedMiniProgram = null

async function launch() {
  if (sharedMiniProgram) return sharedMiniProgram

  sharedMiniProgram = await automator.launch({
    cliPath: CLI_PATH,
    projectPath: PROJECT_PATH,
    timeout: TIMEOUT
  })
  return sharedMiniProgram
}

async function close() {
  // 不关闭连接，由 globalTeardown 统一关闭
}

async function waitForPage(mp, pagePath, timeout = 10000) {
  const page = await mp.reLaunch(`/${pagePath}`)
  if (!page) throw new Error(`Failed to navigate to ${pagePath}`)
  await page.waitFor(timeout)
  return page
}

async function safeText(element) {
  try {
    return element ? await element.text() : ''
  } catch {
    return ''
  }
}

async function safeAttribute(element, name) {
  try {
    return element ? await element.attribute(name) : ''
  } catch {
    return ''
  }
}

async function measureTime(fn) {
  const start = Date.now()
  const result = await fn()
  const duration = Date.now() - start
  return { result, duration }
}

module.exports = {
  automator,
  CLI_PATH,
  PROJECT_PATH,
  TIMEOUT,
  launch,
  close,
  waitForPage,
  safeText,
  safeAttribute,
  measureTime
}
