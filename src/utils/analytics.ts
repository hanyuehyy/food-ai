import { logAnalyticsEvents } from '@/api/cloud'
import type { AnalyticsEvent } from '@/types/cloud'

const FLUSH_THRESHOLD = 10
const SESSION_ID_KEY = 'analytics_session_id'

let eventQueue: AnalyticsEvent[] = []
let flushing = false

function getSessionId(): string {
  let sessionId = uni.getStorageSync(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    uni.setStorageSync(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

export function trackEvent(eventType: string, params: Record<string, unknown> = {}) {
  const pages = getCurrentPages()
  const currentPage = pages.length > 0 ? pages[pages.length - 1]?.route || '' : ''

  eventQueue.push({
    eventType,
    page: currentPage,
    params,
    timestamp: Date.now()
  })

  if (eventQueue.length >= FLUSH_THRESHOLD) {
    flushEvents()
  }
}

export async function flushEvents() {
  if (flushing || eventQueue.length === 0) {
    return
  }

  flushing = true
  const batch = eventQueue.splice(0, 50)
  const sessionId = getSessionId()

  try {
    await logAnalyticsEvents(sessionId, batch)
  } catch {
    // fire-and-forget: 静默失败，不放回队列
  } finally {
    flushing = false
  }

  // 如果 flush 过程中又积累了事件，继续 flush
  if (eventQueue.length >= FLUSH_THRESHOLD) {
    flushEvents()
  }
}

export function setupAnalyticsLifecycle() {
  // #ifdef MP-WEIXIN
  uni.onAppHide(() => {
    flushEvents()
  })
  // #endif
}
