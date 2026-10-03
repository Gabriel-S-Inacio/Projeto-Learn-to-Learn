import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackEvent } from '../../services/analyticsService'
import { captureAttribution, getSessionId } from '../../services/attribution'

let lastNavigation = { signature: '', at: 0 }

export default function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    captureAttribution(location.search)
    const navigation = `${getSessionId()}:${location.key}:${location.pathname}`
    const now = Date.now()
    if (lastNavigation.signature === navigation && now - lastNavigation.at < 250) return
    lastNavigation = { signature: navigation, at: now }
    void trackEvent('page_view', { path: location.pathname }).catch(() => undefined)
  }, [location.key, location.pathname, location.search])

  return null
}
