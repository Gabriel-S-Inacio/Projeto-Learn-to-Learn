import { apiRequest } from './apiClient'

export async function getAdminSchedule() {
  const response = await apiRequest('/admin/schedule')
  return response.slots
}

export async function createAdminSlot(input) {
  return apiRequest('/admin/schedule', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateAdminSlot(slotId, input) {
  return apiRequest(`/admin/schedule/${slotId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

