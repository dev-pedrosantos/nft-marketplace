import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { Paginated } from '@/types/api'
import type { CatalogFilters, FeaturedNft, Nft, NftListParams } from './types'

export async function getNfts(params: NftListParams) {
  const { data } = await apiClient.get<Paginated<Nft>>('/nfts', { params })
  return data
}

export async function getFeaturedNft() {
  const { data } = await apiClient.get<FeaturedNft>('/nfts/featured')
  return data
}

export async function getCatalogFilters() {
  const { data } = await apiClient.get<CatalogFilters>('/catalog/filters')
  return data
}

export const nftQueries = {
  list: (params: NftListParams) =>
    queryOptions({
      queryKey: ['nfts', 'list', params],
      queryFn: () => getNfts(params),
      placeholderData: keepPreviousData,
    }),
  featured: () =>
    queryOptions({
      queryKey: ['nfts', 'featured'],
      queryFn: getFeaturedNft,
    }),
  filters: () =>
    queryOptions({
      queryKey: ['catalog', 'filters'],
      queryFn: getCatalogFilters,
    }),
}
