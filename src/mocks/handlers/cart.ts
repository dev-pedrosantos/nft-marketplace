import { http, HttpResponse, type HttpHandler } from 'msw'
import type { AddToCartInput } from '@/features/cart/types'
import { EDITION_IDS, type EditionId } from '@/features/nfts/types'
import { MAX_QUANTITY_PER_LINE } from '../data/nfts'
import { cartOf, commit, createId, findNft, inventoryOf } from '../db'
import { checkCoupon, computeCart } from '../projections'
import { api, errorResponse, latency, readJson, resolveViewer } from './utils'

const DEFAULT_NETWORK = 'ethereum'

function networkParam(request: Request) {
  return new URL(request.url).searchParams.get('network') ?? DEFAULT_NETWORK
}

function stockError(available: number) {
  if (available === 0) return errorResponse(409, 'SOLD_OUT', 'Esta edição esgotou.')
  return errorResponse(
    409,
    'INSUFFICIENT_STOCK',
    `Restam apenas ${available} ${available === 1 ? 'unidade' : 'unidades'} desta edição.`,
  )
}

function limitError() {
  return errorResponse(
    422,
    'QUANTITY_LIMIT',
    `Cada edição aceita no máximo ${MAX_QUANTITY_PER_LINE} unidades por pedido.`,
  )
}

export const cartHandlers: HttpHandler[] = [
  http.get(api('/cart'), async ({ request }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    return HttpResponse.json(computeCart(cartOf(viewer.ownerKey), networkParam(request)))
  }),

  http.get(api('/cart/summary'), async ({ request }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const lines = cartOf(viewer.ownerKey).lines
    return HttpResponse.json({ itemCount: lines.reduce((total, line) => total + line.quantity, 0) })
  }),

  http.post(api('/cart/items'), async ({ request }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const body = await readJson<AddToCartInput>(request)
    const record = body.nftId ? findNft(body.nftId) : undefined
    if (!record) return errorResponse(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    if (!EDITION_IDS.includes(body.editionId as EditionId)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma edição.')
    }
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
    }

    const editionId = body.editionId as EditionId
    const inventory = inventoryOf(record.id)
    const cart = cartOf(viewer.ownerKey)
    const existing = cart.lines.find(
      (line) => line.nftId === record.id && line.editionId === editionId,
    )
    const nextQuantity = (existing?.quantity ?? 0) + quantity
    if (nextQuantity > inventory.available[editionId]) return stockError(inventory.available[editionId])
    if (nextQuantity > MAX_QUANTITY_PER_LINE) return limitError()

    if (existing) {
      existing.quantity = nextQuantity
      existing.priceAtAddEth = inventory.priceEth
    } else {
      cart.lines.push({
        id: createId('line'),
        nftId: record.id,
        editionId,
        quantity,
        priceAtAddEth: inventory.priceEth,
      })
    }
    commit()
    return HttpResponse.json(computeCart(cart, networkParam(request)), { status: 201 })
  }),

  http.patch(api('/cart/items/:lineId'), async ({ request, params }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const cart = cartOf(viewer.ownerKey)
    const line = cart.lines.find((item) => item.id === params.lineId)
    if (!line) return errorResponse(404, 'LINE_NOT_FOUND', 'Item não está mais no carrinho.')
    const { quantity } = await readJson<{ quantity: number }>(request)
    if (!Number.isInteger(quantity) || quantity! < 1) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
    }
    const available = inventoryOf(line.nftId).available[line.editionId]
    // Lowering the quantity is always allowed so the user can fix a stock issue.
    if (quantity! > line.quantity && quantity! > available) return stockError(available)
    if (quantity! > MAX_QUANTITY_PER_LINE) return limitError()
    line.quantity = quantity!
    commit()
    return HttpResponse.json(computeCart(cart, networkParam(request)))
  }),

  http.delete(api('/cart/items/:lineId'), async ({ request, params }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const cart = cartOf(viewer.ownerKey)
    cart.lines = cart.lines.filter((line) => line.id !== params.lineId)
    if (cart.lines.length === 0) cart.couponCode = null
    commit()
    return HttpResponse.json(computeCart(cart, networkParam(request)))
  }),

  /** Accepts the price change of a line: the user saw and confirmed the new price. */
  http.post(api('/cart/items/:lineId/accept-price'), async ({ request, params }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const cart = cartOf(viewer.ownerKey)
    const line = cart.lines.find((item) => item.id === params.lineId)
    if (!line) return errorResponse(404, 'LINE_NOT_FOUND', 'Item não está mais no carrinho.')
    line.priceAtAddEth = inventoryOf(line.nftId).priceEth
    commit()
    return HttpResponse.json(computeCart(cart, networkParam(request)))
  }),

  http.post(api('/cart/coupon'), async ({ request }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const { code } = await readJson<{ code: string }>(request)
    if (!code?.trim()) return errorResponse(422, 'VALIDATION_ERROR', 'Digite um código promocional.')
    const cart = cartOf(viewer.ownerKey)
    if (cart.lines.length === 0) {
      return errorResponse(422, 'CART_EMPTY', 'Adicione NFTs ao carrinho antes de aplicar um código.')
    }
    const current = computeCart(cart, networkParam(request))
    const check = checkCoupon(code, current.subtotalEth)
    if (!check.ok) return errorResponse(check.status, check.code, check.message)
    cart.couponCode = check.coupon.code
    commit()
    return HttpResponse.json(computeCart(cart, networkParam(request)))
  }),

  http.delete(api('/cart/coupon'), async ({ request }) => {
    await latency()
    const viewer = resolveViewer(request)
    if (viewer instanceof Response) return viewer
    const cart = cartOf(viewer.ownerKey)
    cart.couponCode = null
    commit()
    return HttpResponse.json(computeCart(cart, networkParam(request)))
  }),
]
