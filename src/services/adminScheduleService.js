import { apiRequest } from './apiClient'

export async function getAdminSchedule() {
  const response = await apiRequest('/admin/schedule')
  return response.slots
}

export async function getConvertedStudents() {
  const response = await apiRequest('/admin/students/converted')
  return response.students
}

export async function createRegularLesson(input) {
  return apiRequest('/admin/lessons', { method: 'POST', body: JSON.stringify(input) })
}

export async function createAdminSlot(input) {
  return apiRequest('/admin/schedule', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateAdminSlot(slotId, input) {
  return apiRequest(`/admin/schedule/${slotId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function cancelAdminBooking(bookingId, reason) {
  return apiRequest(`/admin/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

