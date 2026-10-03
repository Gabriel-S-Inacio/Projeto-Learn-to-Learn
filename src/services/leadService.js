import { apiRequest } from './apiClient'
import { getTrackingContext } from './attribution'

export function createLead(input) {
  return apiRequest('/leads', {
    method: 'POST',
    body: JSON.stringify({ ...input, source: 'FORM', ...getTrackingContext() }),
  })
}
