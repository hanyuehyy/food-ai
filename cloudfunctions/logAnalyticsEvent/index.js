const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function success(data) {
  return {
    success: true,
    code: 0,
    message: 'success',
    data
  }
}

function fail(code, message) {
  return {
    success: false,
    code,
    message,
    data: null
  }
}

exports.main = async (event = {}) => {
  try {
    const { sessionId, events } = event

    if (!Array.isArray(events) || events.length === 0) {
      return success({ inserted: 0 })
    }

    await db.collection('analytics_events').add({
      data: {
        sessionId: sessionId || '',
        events: events.map((e) => ({
          eventType: e.eventType || '',
          page: e.page || '',
          params: e.params || {},
          timestamp: e.timestamp || Date.now()
        })),
        createdAt: db.serverDate()
      }
    })

    return success({ inserted: events.length })
  } catch (error) {
    console.error('[logAnalyticsEvent] write failed', error)
    return fail(50001, '埋点数据写入失败')
  }
}
