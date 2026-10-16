import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { Promotion } from './types'

export async function getPromotions() {
  const { data } = await apiClient.get<Promotion[]>('/promotions')
  return data
}

export const promotionQueries = {
  list: () =>
    queryOptions({
      queryKey: ['promotions'],
      queryFn: getPromotions,
    }),
}
