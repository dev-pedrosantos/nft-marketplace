export const NFT_TABS = ['all', 'new', 'trending'] as const
export type NftTab = (typeof NFT_TABS)[number]

export interface Nft {
  id: string
  name: string
  imageUrl: string
  priceEth: number
  previousPriceEth?: number
  isRare?: boolean
}

export interface NftListParams {
  tab: NftTab
  page: number
  collection?: string
  network?: string
  minPrice?: number
  maxPrice?: number
  search?: string
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
