import { isAxiosError } from 'axios'

export class ApiError extends Error {
  readonly status: number | null
  readonly data: unknown

  constructor(message: string, status: number | null, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    return new ApiError(
      error.message,
      error.response?.status ?? null,
      error.response?.data,
    )
  }

  return new ApiError(
    error instanceof Error ? error.message : 'Unknown error',
    null,
    undefined,
  )
}
