import { useMutation } from '@tanstack/react-query'
import { sessionStore } from '@/features/auth/session-store'
import type { User } from '@/features/auth/types'
import { apiClient } from '@/lib/api/client'
import type { PasswordChangeInput, ProfileInput } from './types'

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { data } = await apiClient.put<User>('/me/profile', input)
      return data
    },
    onSuccess: (user) => sessionStore.updateUser(user),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: PasswordChangeInput) => {
      await apiClient.put('/me/password', input)
    },
  })
}

export function useUpdateAvatar() {
  return useMutation({
    mutationFn: async (dataUrl: string) => {
      const { data } = await apiClient.put<User>('/me/avatar', { dataUrl })
      return data
    },
    onSuccess: (user) => sessionStore.updateUser(user),
  })
}

export function useRemoveAvatar() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.delete<User>('/me/avatar')
      return data
    },
    onSuccess: (user) => sessionStore.updateUser(user),
  })
}
