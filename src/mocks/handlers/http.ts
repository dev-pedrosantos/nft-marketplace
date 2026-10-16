import { http, HttpResponse, type HttpHandler } from 'msw'
import { env } from '@/config/env'
import { cartSummary } from '../data/cart'
import {
  catalogFilters,
  featuredNft,
  NFT_PAGE_SIZE,
  NFT_TOTAL_PAGES,
  nfts,
} from '../data/nfts'
import { posts } from '../data/posts'
import { promotions } from '../data/promotions'

const api = (path: string) => `${env.apiUrl}${path}`

// Response fixtures belong in `src/mocks/data`, never inside UI components.
export const httpHandlers: HttpHandler[] = [
  // Only `page` and `search` change the result: the design does not say which NFTs
  // belong to each tab, collection, network or price range.
  http.get(api('/nfts'), ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const search = url.searchParams.get('search')?.trim().toLowerCase()

    if (search) {
      const items = nfts.filter((nft) => nft.name.toLowerCase().includes(search))
      return HttpResponse.json({ items, page: 1, pageSize: NFT_PAGE_SIZE, totalPages: 1 })
    }

    return HttpResponse.json({
      items: page === 1 ? nfts : [],
      page,
      pageSize: NFT_PAGE_SIZE,
      totalPages: NFT_TOTAL_PAGES,
    })
  }),
  http.get(api('/nfts/featured'), () => HttpResponse.json(featuredNft)),
  http.get(api('/catalog/filters'), () => HttpResponse.json(catalogFilters)),
  http.get(api('/promotions'), () => HttpResponse.json(promotions)),
  http.get(api('/posts'), ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? posts.length)
    return HttpResponse.json(posts.slice(0, limit))
  }),
  http.get(api('/cart/summary'), () => HttpResponse.json(cartSummary)),
  http.post(api('/newsletter/subscriptions'), async ({ request }) => {
    const body = (await request.json()) as { email?: string }
    if (!body.email) {
      return HttpResponse.json({ message: 'E-mail obrigatório' }, { status: 422 })
    }
    return new HttpResponse(null, { status: 201 })
  }),
]
