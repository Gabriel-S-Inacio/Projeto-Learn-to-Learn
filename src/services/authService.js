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

