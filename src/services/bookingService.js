import { apiRequest } from './apiClient'
import { getSessionId } from './attribution'

export async function createBooking(slotId) {
  return apiRequest('/bookings', { method: 'POST', body: JSON.stringify({ slotId, sessionId: getSessionId() }) })
}

export async function getMyBookings() {
  const response = await apiRequest('/bookings/me')
  return response.lessons
}

export async function cancelBooking(bookingId) {
  return apiRequest(`/bookings/${bookingId}`, { method: 'DELETE' })
}

export async function rescheduleBooking(bookingId, newSlotId) {
  return apiRequest(`/bookings/${bookingId}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify({ newSlotId }),
  })
}
