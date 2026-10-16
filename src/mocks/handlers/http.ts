import { http, HttpResponse, type HttpHandler } from 'msw'
import { posts } from '../data/posts'
import { promotions } from '../data/promotions'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { checkoutHandlers } from './checkout'
import { api, latency } from './utils'

// Response fixtures belong in `src/mocks/data`, never inside UI components.
const contentHandlers: HttpHandler[] = [
  http.get(api('/promotions'), async () => {
    await latency()
    return HttpResponse.json(promotions)
  }),
  http.get(api('/posts'), async ({ request }) => {
    await latency()
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? posts.length)
    return HttpResponse.json(posts.slice(0, limit))
  }),
  http.post(api('/newsletter/subscriptions'), async ({ request }) => {
    await latency()
    const body = (await request.json()) as { email?: string }
    if (!body.email) {
      return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'E-mail obrigatório' }, { status: 422 })
    }
    return new HttpResponse(null, { status: 201 })
  }),
]

export const httpHandlers: HttpHandler[] = [
  ...catalogHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...contentHandlers,
]
