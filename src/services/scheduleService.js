import { apiRequest } from './apiClient'

export async function getAvailableSlots() {
  const response = await apiRequest('/schedule/available')
  return response.slots
}
