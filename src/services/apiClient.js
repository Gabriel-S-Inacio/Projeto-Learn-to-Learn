const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message || 'Não foi possível concluir a operação.',
      response.status,
      body?.error?.code || 'REQUEST_FAILED',
      body?.error?.details,
    )
  }
  return body
}

