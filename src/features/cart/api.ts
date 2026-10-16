import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useViewerKey } from '@/features/auth/session-store'
import { apiClient } from '@/lib/api/client'
import type { AddToCartInput, Cart, CartSummary } from './types'

export const DEFAULT_NETWORK_ID = 'ethereum'

export async function getCart(networkId: string) {
  const { data } = await apiClient.get<Cart>('/cart', { params: { network: networkId } })
  return data
}

export async function getCartSummary() {
  const { data } = await apiClient.get<CartSummary>('/cart/summary')
  return data
}

export const cartQueries = {
  all: () => ['cart'] as const,
  detail: (viewer: string, networkId = DEFAULT_NETWORK_ID) =>
    queryOptions({
      queryKey: ['cart', viewer, 'detail', networkId],
      queryFn: () => getCart(networkId),
      staleTime: 0,
    }),
  summary: (viewer: string) =>
    queryOptions({
      queryKey: ['cart', viewer, 'summary'],
      queryFn: getCartSummary,
    }),
}

/** Every cart mutation answers with the recomputed cart. */
function useCartMutation<TVariables>(
  request: (variables: TVariables, networkId: string) => Promise<Cart>,
  networkId = DEFAULT_NETWORK_ID,
) {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()
  return useMutation({
    mutationFn: (variables: TVariables) => request(variables, networkId),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueries.detail(viewer, networkId).queryKey, cart)
      queryClient.setQueryData(cartQueries.summary(viewer).queryKey, { itemCount: cart.itemCount })
      // Totals for other networks are now outdated; they refetch when next used.
      void queryClient.invalidateQueries({ queryKey: ['cart', viewer], refetchType: 'none' })
    },
  })
}

export function useAddToCart() {
  return useCartMutation(async (input: AddToCartInput, network) => {
    const { data } = await apiClient.post<Cart>('/cart/items', input, { params: { network } })
    return data
  })
}

export function useUpdateCartLine(networkId?: string) {
  return useCartMutation(async ({ lineId, quantity }: { lineId: string; quantity: number }, network) => {
    const { data } = await apiClient.patch<Cart>(`/cart/items/${lineId}`, { quantity }, { params: { network } })
    return data
  }, networkId)
}

export function useRemoveCartLine(networkId?: string) {
  return useCartMutation(async (lineId: string, network) => {
    const { data } = await apiClient.delete<Cart>(`/cart/items/${lineId}`, { params: { network } })
    return data
  }, networkId)
}

export function useAcceptLinePrice(networkId?: string) {
  return useCartMutation(async (lineId: string, network) => {
    const { data } = await apiClient.post<Cart>(`/cart/items/${lineId}/accept-price`, null, {
      params: { network },
    })
    return data
  }, networkId)
}

export function useApplyCoupon(networkId?: string) {
  return useCartMutation(async (code: string, network) => {
    const { data } = await apiClient.post<Cart>('/cart/coupon', { code }, { params: { network } })
    return data
  }, networkId)
}

export function useRemoveCoupon(networkId?: string) {
  return useCartMutation(async (_: void, network) => {
    const { data } = await apiClient.delete<Cart>('/cart/coupon', { params: { network } })
    return data
  }, networkId)
}
