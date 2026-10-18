import { http, HttpResponse, type HttpHandler } from 'msw'
import { posts } from '../data/posts'
import { promotions } from '../data/promotions'
import { isScenarioActive } from '../scenarios'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { checkoutHandlers } from './checkout'
import { api, errorResponse, latency, type ApiErrorBody } from './utils'

const RETRY_AFTER_SECONDS = 5

// Answers before every route while a global failure scenario is on; otherwise falls through.
const failureScenarios = http.all(api('/*'), () => {
  if (isScenarioActive('offline')) return HttpResponse.error()
  if (isScenarioActive('http-500')) {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno do servidor. Tente novamente em instantes.')
  }
  if (isScenarioActive('http-429')) {
    return HttpResponse.json<ApiErrorBody>(
      { code: 'RATE_LIMITED', message: 'Muitas requisições em pouco tempo. Aguarde alguns segundos e tente novamente.' },
      { status: 429, headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) } },
    )
  }
})

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
  failureScenarios,
  ...catalogHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...contentHandlers,
]
