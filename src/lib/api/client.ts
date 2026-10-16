import axios from 'axios'
import { env } from '@/config/env'
import { sessionStore } from '@/features/auth/session-store'
import { toApiError } from './errors'

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = sessionStore.token()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Id', sessionStore.guestId())
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.status === 401 && sessionStore.token()) {
      sessionStore.end(apiError.code === 'SESSION_EXPIRED' ? 'expired' : 'logout')
    }
    return Promise.reject(apiError)
  },
)
