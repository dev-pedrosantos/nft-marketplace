import type { DecimalString } from '@/lib/money'

export const NFT_TABS = ['all', 'new', 'trending'] as const
export type NftTab = (typeof NFT_TABS)[number]

export const NFT_SORTS = ['recent', 'price-asc', 'price-desc'] as const
export type NftSort = (typeof NFT_SORTS)[number]

export interface Nft {
  id: string
  name: string
  imageUrl: string
  priceEth: DecimalString
  previousPriceEth?: DecimalString
  isRare?: boolean
  /** Bumped on every price or availability change; realtime events at or below it are stale. */
  version: number
}

export interface NftListParams {
  tab: NftTab
  page: number
  sort?: NftSort
  collection?: string
  network?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}

export const EDITION_IDS = ['1-1', '1-10', '1-50', 'open'] as const
export type EditionId = (typeof EDITION_IDS)[number]

export interface NftEdition {
  id: EditionId
  label: string
  /** `null` for the open edition. */
  supply: number | null
  available: number
}

export interface NftNetwork {
  id: string
  label: string
}

export interface NftDetails extends Nft {
  tokenId: string
  collection: { id: string; name: string }
  attributes: string[]
  summary: string
  description: string[]
  network: NftNetwork
  networkInfo: string
  contractInfo: string
  royaltiesInfo: string
  gallery: string[]
  rating: { average: string; count: number }
  editions: NftEdition[]
  defaultEditionId: EditionId
}

/** Payload of the `nft.updated` realtime event. */
export interface NftUpdate {
  id: string
  priceEth: DecimalString
  editions: Pick<NftEdition, 'id' | 'available'>[]
  version: number
}

export interface CatalogFilterOption {
  id: string
  label: string
  count: number
}

export interface PriceRange {
  min: number
  max: number
}

export interface CatalogFilters {
  collections: CatalogFilterOption[]
  networks: CatalogFilterOption[]
  priceRange: PriceRange
}

export interface FeaturedNft {
  id: string
  headline: string
  tagline: string
  imageUrl: string
}
