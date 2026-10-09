import { apiRequest } from './apiClient'

function queryString(filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
  return params.toString()
}

export async function getAdminLeads(filters = {}) {
  const response = await apiRequest(`/admin/leads?${queryString(filters)}`)
  return response.leads
}

export function getLeadMetrics(filters = {}) {
  return apiRequest(`/admin/leads/metrics?${queryString(filters)}`)
}

export function updateLeadStatus(leadId, status) {
  return apiRequest(`/admin/leads/${leadId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export function reopenLead(leadId, status, reason) {
  return apiRequest(`/admin/leads/${leadId}/reopen`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  })
}
