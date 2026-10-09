import { apiRequest } from './apiClient'

export async function register(input) {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export async function login(input) {
  return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export async function logout() {
  return apiRequest('/auth/logout', { method: 'POST' })
}

export async function getCurrentUser() {
  return apiRequest('/auth/me')
}

export async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function resetPassword(token, password) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
}

export async function updateProfile(input) {
  return apiRequest('/account/profile', { method: 'PATCH', body: JSON.stringify(input) })
}

export async function changePassword(input) {
  return apiRequest('/account/password', { method: 'PATCH', body: JSON.stringify(input) })
}

