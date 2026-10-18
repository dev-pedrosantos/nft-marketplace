import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession, useViewerKey } from '@/features/auth/session-store'
import { apiClient } from '@/lib/api/client'
import type { Wallet, WalletConnection, WalletInput, WalletProvider, WalletRole } from './types'

export async function getWallets() {
  const { data } = await apiClient.get<Wallet[]>('/me/wallets')
  return data
}

export async function getWalletConnection() {
  const { data } = await apiClient.get<WalletConnection | null>('/me/wallet-connection')
  return data
}

export const walletQueries = {
  list: (viewer: string) =>
    queryOptions({
      queryKey: ['wallets', viewer],
      queryFn: getWallets,
    }),
  connection: (viewer: string) =>
    queryOptions({
      queryKey: ['wallets', viewer, 'connection'],
      queryFn: getWalletConnection,
    }),
}

export function useWallets() {
  const session = useSession()
  const viewer = useViewerKey()
  return useQuery({ ...walletQueries.list(viewer), enabled: Boolean(session) })
}

function useWalletMutation<TVariables, TResult>(request: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()
  return useMutation({
    mutationFn: request,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletQueries.list(viewer).queryKey }),
  })
}

export function useCreateWallet() {
  return useWalletMutation(async (input: WalletInput & { role: WalletRole }) => {
    const { data } = await apiClient.post<Wallet>('/me/wallets', input)
    return data
  })
}

export function useUpdateWallet() {
  return useWalletMutation(async ({ id, ...input }: WalletInput & { id: string }) => {
    const { data } = await apiClient.put<Wallet>(`/me/wallets/${id}`, input)
    return data
  })
}

export function useDeleteWallet() {
  return useWalletMutation(async (id: string) => {
    await apiClient.delete(`/me/wallets/${id}`)
  })
}

/* ------------------------- Simulated wallet connection ------------------------ */

export function useWalletConnection() {
  const session = useSession()
  const viewer = useViewerKey()
  return useQuery({ ...walletQueries.connection(viewer), enabled: Boolean(session) })
}

/** Asks the wallet to connect; the API answers after the (simulated) approval or refusal. */
export function useConnectWallet() {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()
  return useMutation({
    mutationFn: async (provider: WalletProvider) => {
      const { data } = await apiClient.post<WalletConnection>('/me/wallet-connection', { provider })
      return data
    },
    onSuccess: (connection) => queryClient.setQueryData(walletQueries.connection(viewer).queryKey, connection),
  })
}

export function useDisconnectWallet() {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/me/wallet-connection')
    },
    onSuccess: () => queryClient.setQueryData(walletQueries.connection(viewer).queryKey, null),
  })
}
