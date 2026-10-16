import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { sessionStore } from './session-store'
import type { LoginInput, RegisterInput, Session } from './types'

/** Query roots that hold per-user data and must not outlive the session. */
export const USER_SCOPED_QUERY_ROOTS = ['cart', 'favorites', 'wallets', 'orders'] as const

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<Session>('/auth/login', input)
      return data
    },
    onSuccess: (session) => sessionStore.start(session),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await apiClient.post<Session>('/auth/register', input)
      return data
    },
    onSuccess: (session) => sessionStore.start(session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // The local session ends even if the server call fails.
      await apiClient.post('/auth/logout').catch(() => undefined)
    },
    onSettled: () => {
      sessionStore.end('logout')
      queryClient.removeQueries({
        predicate: (query) =>
          (USER_SCOPED_QUERY_ROOTS as readonly unknown[]).includes(query.queryKey[0]) &&
          query.queryKey[1] !== 'guest',
      })
    },
  })
}
