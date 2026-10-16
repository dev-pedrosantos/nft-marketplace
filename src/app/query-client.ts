import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'

const MAX_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const isClientError =
            error instanceof ApiError &&
            error.status !== null &&
            error.status >= 400 &&
            error.status < 500
          return !isClientError && failureCount < MAX_RETRIES
        },
      },
    },
  })
}
