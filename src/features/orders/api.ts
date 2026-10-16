import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession, useViewerKey } from '@/features/auth/session-store'
import { apiClient } from '@/lib/api/client'
import type { CheckoutQuote, Order, PlaceOrderInput, QuoteRequest } from './types'

/** While a payment is pending the order is polled as a fallback to `order.updated`. */
export const PENDING_POLL_MS = 3000

export async function getOrders() {
  const { data } = await apiClient.get<Order[]>('/orders')
  return data
}

export async function getOrder(id: string) {
  const { data } = await apiClient.get<Order>(`/orders/${encodeURIComponent(id)}`)
  return data
}

export const orderQueries = {
  list: (viewer: string) =>
    queryOptions({
      queryKey: ['orders', viewer, 'list'],
      queryFn: getOrders,
      staleTime: 0,
    }),
  detail: (viewer: string, id: string) =>
    queryOptions({
      queryKey: ['orders', viewer, 'detail', id],
      queryFn: () => getOrder(id),
      staleTime: 0,
      refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_POLL_MS : false),
    }),
}

export function useOrders() {
  const session = useSession()
  const viewer = useViewerKey()
  return useQuery({
    ...orderQueries.list(viewer),
    enabled: Boolean(session),
    refetchInterval: (query) =>
      query.state.data?.some((order) => order.status === 'pending') ? PENDING_POLL_MS : false,
  })
}

export function useRequestQuote() {
  return useMutation({
    mutationFn: async (input: QuoteRequest) => {
      const { data } = await apiClient.post<CheckoutQuote>('/checkout/quote', input)
      return data
    },
  })
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()
  return useMutation({
    mutationFn: async ({ idempotencyKey, ...input }: PlaceOrderInput & { idempotencyKey: string }) => {
      const { data } = await apiClient.post<Order>('/orders', input, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      return data
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderQueries.detail(viewer, order.id).queryKey, order)
      void queryClient.invalidateQueries({ queryKey: orderQueries.list(viewer).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
    },
  })
}
