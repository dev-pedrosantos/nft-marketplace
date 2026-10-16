import { isAxiosError } from 'axios'

interface ApiErrorBody {
  code?: string
  message?: string
  fieldErrors?: Record<string, string>
}

export class ApiError extends Error {
  readonly status: number | null
  readonly code: string | null
  readonly fieldErrors: Record<string, string>
  readonly data: unknown
  /** The request never got an answer (timeout or connection failure). */
  readonly isNetworkError: boolean

  constructor(
    message: string,
    options: {
      status?: number | null
      code?: string | null
      fieldErrors?: Record<string, string>
      data?: unknown
      isNetworkError?: boolean
    } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? null
    this.code = options.code ?? null
    this.fieldErrors = options.fieldErrors ?? {}
    this.data = options.data
    this.isNetworkError = options.isNetworkError ?? false
  }
}

const NETWORK_MESSAGE = 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'
const TIMEOUT_MESSAGE = 'O servidor demorou demais para responder. Tente novamente.'

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ApiError(timedOut ? TIMEOUT_MESSAGE : NETWORK_MESSAGE, {
        code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        isNetworkError: true,
      })
    }
    const body = (error.response.data ?? {}) as ApiErrorBody
    return new ApiError(body.message ?? error.message, {
      status: error.response.status,
      code: body.code ?? null,
      fieldErrors: body.fieldErrors,
      data: error.response.data,
    })
  }

  return new ApiError(error instanceof Error ? error.message : 'Erro inesperado.')
}

/** User-facing message for any error thrown by a query or mutation. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (error instanceof ApiError) return error.message || fallback
  return fallback
}
