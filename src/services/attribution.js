const ATTRIBUTION_KEY = 'ltl_attribution'
const SESSION_KEY = 'ltl_analytics_session'

function storageAvailable() {
  return typeof window !== 'undefined' && window.sessionStorage && window.localStorage
}

export function getSessionId() {
  if (!storageAvailable()) return 'server-session'
  let sessionId = window.sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

export function captureAttribution(search = window.location.search) {
  if (!storageAvailable()) return {}
  const existing = getAttribution()
  const params = new URLSearchParams(search)
  const incoming = {
    utmSource: params.get('utm_source')?.slice(0, 200) || undefined,
    utmMedium: params.get('utm_medium')?.slice(0, 200) || undefined,
    utmCampaign: params.get('utm_campaign')?.slice(0, 200) || undefined,
  }
  const attribution = {
    utmSource: existing.utmSource || incoming.utmSource,
    utmMedium: existing.utmMedium || incoming.utmMedium,
    utmCampaign: existing.utmCampaign || incoming.utmCampaign,
  }
  if (Object.values(attribution).some(Boolean)) window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  return attribution
}

export function getAttribution() {
  if (!storageAvailable()) return {}
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getTrackingContext() {
  return { ...getAttribution(), sessionId: getSessionId() }
}
