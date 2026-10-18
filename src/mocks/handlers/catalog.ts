import { http, HttpResponse, type HttpHandler } from 'msw'
import { NFT_SORTS, NFT_TABS, type NftSort, type NftTab } from '@/features/nfts/types'
import { compareAmounts, toWei } from '@/lib/money'
import {
  catalogFilters,
  featuredNft,
  NEW_RELEASE_WINDOW_MINUTES,
  NFT_PAGE_SIZE,
  nftSeed,
  RELATED_LIMIT,
} from '../data/nfts'
import { findNft, inventoryOf } from '../db'
import { toNft, toNftDetails } from '../projections'
import { api, errorResponse, latency } from './utils'

const priceOf = (id: string) => inventoryOf(id).priceEth

function parseNumber(value: string | null) {
  if (value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const catalogHandlers: HttpHandler[] = [
  http.get(api('/nfts'), async ({ request }) => {
    await latency()
    const params = new URL(request.url).searchParams
    const tab = (NFT_TABS as readonly string[]).includes(params.get('tab') ?? '')
      ? (params.get('tab') as NftTab)
      : 'all'
    const sort = (NFT_SORTS as readonly string[]).includes(params.get('sort') ?? '')
      ? (params.get('sort') as NftSort)
      : 'recent'
    const page = Math.max(1, Math.floor(parseNumber(params.get('page')) ?? 1))
    const search = params.get('search')?.trim().toLowerCase()
    // Without a collection the first one applies, as on the home page, so the list does not
    // have to wait for `/catalog/filters` to learn the default.
    const collection = params.get('collection') || catalogFilters.collections[0]?.id
    const network = params.get('network')
    const minPrice = parseNumber(params.get('minPrice'))
    const maxPrice = parseNumber(params.get('maxPrice'))

    // A search looks across every collection: the collection filter on the home page
    // always has a default selection, which would otherwise hide most matches.
    const matches = nftSeed.filter((nft) => {
      if (search) {
        if (!nft.name.toLowerCase().includes(search)) return false
      } else if (collection && nft.categoryId !== collection) {
        return false
      }
      if (network && nft.networkId !== network) return false
      if (tab === 'new' && nft.listedMinutesAgo > NEW_RELEASE_WINDOW_MINUTES) return false
      if (tab === 'trending' && !nft.trending) return false
      const price = priceOf(nft.id)
      if (minPrice !== undefined && compareAmounts(price, minPrice.toFixed(2)) < 0) return false
      if (maxPrice !== undefined && compareAmounts(price, maxPrice.toFixed(2)) > 0) return false
      return true
    })

    matches.sort((a, b) => {
      if (sort === 'recent') return a.listedMinutesAgo - b.listedMinutesAgo
      const difference = toWei(priceOf(a.id)) - toWei(priceOf(b.id))
      const direction = sort === 'price-asc' ? 1 : -1
      return difference === 0n ? 0 : difference > 0n ? direction : -direction
    })

    const totalPages = Math.max(1, Math.ceil(matches.length / NFT_PAGE_SIZE))
    const start = (page - 1) * NFT_PAGE_SIZE
    return HttpResponse.json({
      items: matches.slice(start, start + NFT_PAGE_SIZE).map(toNft),
      page,
      pageSize: NFT_PAGE_SIZE,
      totalPages,
    })
  }),

  http.get(api('/nfts/featured'), async () => {
    await latency()
    return HttpResponse.json(featuredNft)
  }),

  http.get(api('/catalog/filters'), async () => {
    await latency()
    return HttpResponse.json(catalogFilters)
  }),

  http.get(api('/nfts/:id'), async ({ params }) => {
    await latency()
    const record = findNft(String(params.id))
    if (!record) return errorResponse(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(toNftDetails(record))
  }),

  // Other pieces of the same series, rotating from three positions ahead so each NFT
  // gets a different selection ("Emerald Ape #042" gets the five shown in the design).
  http.get(api('/nfts/:id/related'), async ({ params, request }) => {
    await latency()
    const record = findNft(String(params.id))
    if (!record) return errorResponse(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    const limit = parseNumber(new URL(request.url).searchParams.get('limit')) ?? RELATED_LIMIT
    const series = nftSeed.filter((nft) => nft.series.id === record.series.id)
    const index = series.findIndex((nft) => nft.id === record.id)
    const rotated = [...series.slice(index + 3), ...series.slice(0, index + 3)].filter(
      (nft) => nft.id !== record.id,
    )
    return HttpResponse.json(rotated.slice(0, limit).map(toNft))
  }),
]
