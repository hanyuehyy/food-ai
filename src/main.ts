import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { CLOUD_ENV_ID } from './config/cloud'

function initWechatCloud() {
  // #ifdef MP-WEIXIN
  if (wx.cloud) {
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    })
  }
  // #endif
}

export function createApp() {
  initWechatCloud()

  const app = createSSRApp(App)
  app.use(createPinia())

  return {
    app
  }
}
