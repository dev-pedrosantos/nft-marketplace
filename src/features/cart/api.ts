import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

export interface CartSummary {
  itemCount: number
}

export async function getCartSummary() {
  const { data } = await apiClient.get<CartSummary>('/cart/summary')
  return data
}

export const cartQueries = {
  summary: () =>
    queryOptions({
      queryKey: ['cart', 'summary'],
      queryFn: getCartSummary,
    }),
}
