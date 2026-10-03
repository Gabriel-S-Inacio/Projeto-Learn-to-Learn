import { apiRequest } from './apiClient'
import { getTrackingContext } from './attribution'

export async function trackEvent(eventName, input = {}) {
  const context = getTrackingContext()
  return apiRequest('/analytics/events', {
    method: 'POST',
    body: JSON.stringify({
      eventName,
      sessionId: context.sessionId,
      path: input.path || window.location.pathname,
      utmSource: context.utmSource,
      utmMedium: context.utmMedium,
      utmCampaign: context.utmCampaign,
      metadata: input.metadata || {},
    }),
  })
}
