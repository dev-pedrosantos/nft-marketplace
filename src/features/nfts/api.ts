import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { Paginated } from '@/types/api'
import type { CatalogFilters, FeaturedNft, Nft, NftDetails, NftListParams } from './types'

export async function getNfts(params: NftListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<Paginated<Nft>>('/nfts', { params, signal })
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

export async function getNft(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<NftDetails>(`/nfts/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function getRelatedNfts(id: string, limit: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<Nft[]>(`/nfts/${encodeURIComponent(id)}/related`, {
    params: { limit },
    signal,
  })
  return data
}

// Catalog queries forward the abort signal: when filters or the NFT change, the request
// for the previous ones is cancelled instead of finishing in the background.
export const nftQueries = {
  all: () => ['nfts'] as const,
  list: (params: NftListParams) =>
    queryOptions({
      queryKey: ['nfts', 'list', params],
      queryFn: ({ signal }) => getNfts(params, signal),
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
  detail: (id: string) =>
    queryOptions({
      queryKey: ['nfts', 'detail', id],
      queryFn: ({ signal }) => getNft(id, signal),
      // Price and stock change concurrently; realtime events patch it in between.
      staleTime: 15_000,
    }),
  related: (id: string, limit = 5) =>
    queryOptions({
      queryKey: ['nfts', 'related', id, limit],
      queryFn: ({ signal }) => getRelatedNfts(id, limit, signal),
    }),
}
