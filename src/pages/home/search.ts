import { NFT_TABS, type NftTab } from '@/features/nfts/types'

export interface HomeSearch {
  tab?: NftTab
  page?: number
  collection?: string
  network?: string
  minPrice?: number
  maxPrice?: number
  q?: string
}

const asString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asNumber = (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined
}

export function parseHomeSearch(search: Record<string, unknown>): HomeSearch {
  const page = asNumber(search.page)
  return {
    tab: NFT_TABS.includes(search.tab as NftTab) ? (search.tab as NftTab) : undefined,
    page: page !== undefined && page >= 1 ? Math.floor(page) : undefined,
    collection: asString(search.collection),
    network: asString(search.network),
    minPrice: asNumber(search.minPrice),
    maxPrice: asNumber(search.maxPrice),
    q: asString(search.q),
  }
}
