import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { CheckoutQuote, Order, PlaceOrderInput, QuoteChange, QuoteRequest } from '@/features/orders/types'
import { WALLET_PROVIDERS } from '@/features/wallets/types'
import { formatEth } from '@/lib/format'
import { addAmounts, compareAmounts, isDecimalString } from '@/lib/money'
import { validateCollector } from '@/lib/validation'
import {
  cartOf,
  commit,
  createId,
  db,
  inventoryOf,
  randomHex,
  updateInventory,
  type OrderRecord,
} from '../db'
import { notifyOrderUpdate } from '../realtime'
import { consumeScenario, isScenarioActive } from '../scenarios'
import { computeCart, networkOf, toOrderLines } from '../projections'
import { api, errorResponse, fingerprint, latency, readJson, requireUser, validationError } from './utils'

const QUOTE_TTL_MS = 5 * 60 * 1000
const PAYMENT_SETTLE_MS = 2500
/** Longer than the client's 30s wait, so the "still pending" recovery path shows up. */
const SLOW_PAYMENT_SETTLE_MS = 45_000
/** Longer than the client's 10s request timeout. */
const SLOW_ORDER_RESPONSE_MS = 12_000

/* -------------------------------- Settlement -------------------------------- */

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function publicOrder(order: OrderRecord): Order {
  const {
    userId: _userId,
    idempotencyKey: _key,
    requestFingerprint: _fingerprint,
    settleAt: _settleAt,
    outcome: _outcome,
    reservations: _reservations,
    ...rest
  } = order
  return rest
}

function settle(order: OrderRecord) {
  if (order.status !== 'pending') return
  timers.delete(order.id)
  const now = new Date().toISOString()

  if (order.outcome === 'confirmed') {
    order.status = 'confirmed'
    order.transactionHash = randomHex(32)
    // Purchased editions leave the buyer's cart; anything added meanwhile stays.
    const cart = cartOf(`user:${order.userId}`)
    cart.lines = cart.lines.filter(
      (line) =>
        !order.reservations.some(
          (reserved) => reserved.nftId === line.nftId && reserved.editionId === line.editionId,
        ),
    )
    cart.couponCode = cart.lines.length > 0 ? cart.couponCode : null
  } else {
    order.status = 'failed'
    order.failureReason = 'Pagamento recusado pela carteira. Nenhum valor foi cobrado.'
    for (const reserved of order.reservations) {
      const available = inventoryOf(reserved.nftId).available[reserved.editionId]
      updateInventory(reserved.nftId, {
        available: { [reserved.editionId]: available + reserved.quantity },
      })
    }
  }

  order.updatedAt = now
  order.version += 1
  commit()
  notifyOrderUpdate(order.userId, toOrderUpdate(order))
}

function toOrderUpdate(order: OrderRecord) {
  return { id: order.id, status: order.status, updatedAt: order.updatedAt, version: order.version }
}

function schedule(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const wait = Math.max(0, order.settleAt - Date.now())
  timers.set(order.id, setTimeout(() => settle(order), wait))
}

/** Pending orders survive reloads: settle the overdue ones and re-arm the rest. */
export function resumePendingOrders() {
  for (const order of db.orders) {
    if (order.status !== 'pending') continue
    if (order.settleAt <= Date.now()) settle(order)
    else schedule(order)
  }
}

/* --------------------------------- Scenarios -------------------------------- */

function applyQuoteScenarios(ownerKey: string) {
  const firstLine = cartOf(ownerKey).lines[0]
  if (!firstLine) return
  if (consumeScenario('price-change')) {
    const { priceEth } = inventoryOf(firstLine.nftId)
    updateInventory(firstLine.nftId, { priceEth: addAmounts(priceEth, '0.05') })
  }
  if (consumeScenario('out-of-stock')) {
    updateInventory(firstLine.nftId, { available: { [firstLine.editionId]: 0 } })
  }
}

/* --------------------------------- Handlers --------------------------------- */

export const checkoutHandlers: HttpHandler[] = [
  http.post(api('/checkout/quote'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const body = await readJson<QuoteRequest>(request)

    applyQuoteScenarios(viewer.ownerKey)
    const cartRecord = cartOf(viewer.ownerKey)
    const couponBefore = cartRecord.couponCode
    const cart = computeCart(cartRecord, body.networkId ?? 'ethereum')

    if (cart.items.length === 0) {
      return errorResponse(422, 'CART_EMPTY', 'Seu carrinho está vazio.')
    }
    const blocked = cart.items.filter(
      (item) => item.issue?.type === 'sold-out' || item.issue?.type === 'insufficient-stock',
    )
    if (blocked.length > 0) {
      return errorResponse(
        409,
        'CART_UNAVAILABLE',
        `Disponibilidade alterada: ${blocked
          .map((item) => `${item.nft.name} (${item.issue!.message.toLowerCase()})`)
          .join('; ')} Ajuste o carrinho para continuar.`,
      )
    }

    const changes: QuoteChange[] = []
    for (const item of cart.items) {
      if (item.issue?.type === 'price-changed') {
        changes.push({ type: 'price', message: `${item.nft.name}: ${item.issue.message}` })
      }
    }
    if (couponBefore && !cart.coupon) {
      cartRecord.couponCode = null
      changes.push({ type: 'coupon', message: 'O código promocional não é mais válido e foi removido.' })
    }
    if (
      isDecimalString(body.expectedTotalEth) &&
      compareAmounts(body.expectedTotalEth, cart.totalEth) !== 0 &&
      changes.length === 0
    ) {
      changes.push({
        type: 'fee',
        message: `O total foi recalculado de ${formatEth(body.expectedTotalEth)} para ${formatEth(cart.totalEth)}.`,
      })
    }

    // The user is about to see the current prices, so they become the accepted ones.
    for (const line of cartRecord.lines) line.priceAtAddEth = inventoryOf(line.nftId).priceEth

    const quote: CheckoutQuote = {
      id: createId('quote'),
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
      items: toOrderLines(cart),
      subtotalEth: cart.subtotalEth,
      discountEth: cart.discountEth,
      networkId: cart.networkId,
      networkFeeEth: cart.networkFeeEth,
      totalEth: cart.totalEth,
      changes,
    }
    db.quotes[quote.id] = { quote, userId: viewer.user.id, couponCode: cartRecord.couponCode, used: false }
    commit()
    return HttpResponse.json(quote)
  }),

  http.post(api('/orders'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer

    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return errorResponse(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Cabeçalho Idempotency-Key ausente.')
    }
    const body = await readJson<PlaceOrderInput>(request)
    const requestFingerprint = await fingerprint(body)

    // No `await` from here until the order is stored: concurrent requests with the same key
    // cannot both get past this lookup.
    const existing = db.orders.find(
      (order) => order.userId === viewer.user.id && order.idempotencyKey === idempotencyKey,
    )
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        return errorResponse(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'Esta tentativa de pagamento já foi usada com outros dados. Revise o pedido e confirme de novo.',
        )
      }
      // A retry (double click, timeout, reload) returns the order created the first time.
      return HttpResponse.json(publicOrder(existing))
    }

    if (consumeScenario('server-error')) {
      return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Serviço de pagamento indisponível. Tente novamente.')
    }

    const collector = body.collector ?? ({} as PlaceOrderInput['collector'])
    const invalid = validationError(validateCollector(collector))
    if (invalid) return invalid
    const provider = WALLET_PROVIDERS.find((item) => item.id === body.walletProvider)
    if (!provider) return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma carteira.')
    if (db.walletConnections[viewer.user.id]?.provider !== provider.id) {
      return errorResponse(409, 'WALLET_NOT_CONNECTED', `Conecte a carteira ${provider.label} para pagar.`)
    }

    const stored = body.quoteId ? db.quotes[body.quoteId] : undefined
    if (!stored || stored.userId !== viewer.user.id) {
      return errorResponse(404, 'QUOTE_NOT_FOUND', 'Revisão de valores não encontrada. Revise o pedido novamente.')
    }
    if (stored.used) return errorResponse(409, 'QUOTE_USED', 'Esta revisão já foi usada em outro pedido.')
    if (Date.parse(stored.quote.expiresAt) <= Date.now()) {
      return errorResponse(410, 'QUOTE_EXPIRED', 'Os valores revisados expiraram. Revise o pedido novamente.')
    }

    // The reviewed total is only charged while the prices it was built from still hold.
    const repriced = stored.quote.items.find(
      (item) => compareAmounts(inventoryOf(item.nftId).priceEth, item.unitPriceEth) !== 0,
    )
    if (repriced) {
      return errorResponse(
        409,
        'QUOTE_OUTDATED',
        `O preço de ${repriced.name} mudou depois da revisão. Confirme a compra de novo para revisar os valores.`,
      )
    }

    // Someone else may have bought the last units since the quote.
    const shortage = stored.quote.items.find(
      (item) => inventoryOf(item.nftId).available[item.editionId] < item.quantity,
    )
    if (shortage) {
      return errorResponse(409, 'OUT_OF_STOCK', `${shortage.name} não tem mais unidades suficientes.`)
    }

    for (const item of stored.quote.items) {
      const available = inventoryOf(item.nftId).available[item.editionId]
      updateInventory(item.nftId, { available: { [item.editionId]: available - item.quantity } })
    }

    const now = Date.now()
    const network = networkOf(stored.quote.networkId)
    const order: OrderRecord = {
      id: createId('order'),
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      items: stored.quote.items,
      subtotalEth: stored.quote.subtotalEth,
      discountEth: stored.quote.discountEth,
      networkFeeEth: stored.quote.networkFeeEth,
      totalEth: stored.quote.totalEth,
      networkId: network.id,
      networkLabel: network.label,
      walletProvider: provider.id,
      walletLabel: provider.label,
      walletAddress: collector.walletAddress.trim(),
      transactionHash: null,
      failureReason: null,
      version: 1,
      userId: viewer.user.id,
      idempotencyKey,
      requestFingerprint,
      settleAt: now + (isScenarioActive('payment-timeout') ? SLOW_PAYMENT_SETTLE_MS : PAYMENT_SETTLE_MS),
      outcome: isScenarioActive('payment-failure') ? 'failed' : 'confirmed',
      reservations: stored.quote.items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })),
    }
    stored.used = true
    db.orders.push(order)
    commit()
    schedule(order)
    notifyOrderUpdate(order.userId, toOrderUpdate(order))

    if (consumeScenario('slow-order')) await delay(SLOW_ORDER_RESPONSE_MS)
    return HttpResponse.json(publicOrder(order), { status: 201 })
  }),

  http.get(api('/orders'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const orders = db.orders
      .filter((order) => order.userId === viewer.user.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(publicOrder)
    return HttpResponse.json(orders)
  }),

  http.get(api('/orders/:id'), async ({ request, params }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    // Other users' orders answer 404, not 403, so their existence is not revealed.
    const order = db.orders.find((item) => item.id === params.id && item.userId === viewer.user.id)
    if (!order) return errorResponse(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json(publicOrder(order))
  }),
]
