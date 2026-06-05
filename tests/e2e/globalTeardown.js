const { execSync } = require('child_process')
const CLI_PATH = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PROJECT_PATH = require('path').resolve(__dirname, '../../dist/dev/mp-weixin')

module.exports = async function globalTeardown() {
  try {
    execSync(`"${CLI_PATH}" close --project "${PROJECT_PATH}"`, { timeout: 10000, encoding: 'utf-8' })
  } catch (e) { /* ignore */ }
}
