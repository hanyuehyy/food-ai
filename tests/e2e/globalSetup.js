const { execSync } = require('child_process')
const CLI_PATH = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PROJECT_PATH = require('path').resolve(__dirname, '../../dist/dev/mp-weixin')

module.exports = async function globalSetup() {
  // 关闭已有项目
  try {
    execSync(`"${CLI_PATH}" close --project "${PROJECT_PATH}"`, { timeout: 10000, encoding: 'utf-8' })
  } catch (e) { /* ignore */ }

  // 等待端口释放
  await new Promise(r => setTimeout(r, 2000))
}
