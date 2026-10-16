import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'
import { env } from '@/config/env'
import { addAmounts, compareAmounts, subtractAmounts } from '@/lib/money'
import { nftSeed } from '../data/nfts'
import { findUserByToken, inventoryOf, updateInventory } from '../db'
import { registerRealtimeClient } from '../realtime'
import { isScenarioActive } from '../scenarios'

// Must match the `pingInterval` announced by the handshake in `toSocketIo`,
// otherwise the client drops the connection with a ping timeout.
const ENGINE_IO_PING_INTERVAL_MS = 25_000
const ENGINE_IO_PING_PACKET = '2'
const LIVE_MARKET_INTERVAL_MS = 8_000
const LIVE_MARKET_PRICE_STEP = '0.01'

// MSW strips the "/socket.io/" path before matching, so the link targets the server origin.
function toWebSocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}

function keepAlive({ client }: WebSocketHandlerConnection) {
  const timer = setInterval(
    () => client.send(ENGINE_IO_PING_PACKET),
    ENGINE_IO_PING_INTERVAL_MS,
  )
  client.addEventListener('close', () => clearInterval(timer))
}

/** "Other collectors" buying or repricing the design NFTs while the scenario is on. */
function simulateMarketActivity() {
  if (!isScenarioActive('live-market')) return
  const nft = nftSeed[Math.floor(Math.random() * 8)]
  const inventory = inventoryOf(nft.id)
  if (Math.random() < 0.5) {
    const raise = Math.random() < 0.5
    const next = raise
      ? addAmounts(inventory.priceEth, LIVE_MARKET_PRICE_STEP)
      : subtractAmounts(inventory.priceEth, LIVE_MARKET_PRICE_STEP)
    if (compareAmounts(next, '0.01') >= 0) updateInventory(nft.id, { priceEth: next })
  } else {
    const editionId = nft.defaultEditionId
    const available = inventory.available[editionId]
    if (available > 0) updateInventory(nft.id, { available: { [editionId]: available - 1 } })
  }
}

setInterval(simulateMarketActivity, LIVE_MARKET_INTERVAL_MS)

export const socketLink = ws.link(toWebSocketUrl(env.socketUrl))

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    keepAlive(connection)
    const io = toSocketIo(connection)
    const client = {
      userId: null as string | null,
      emit: (event: string, ...data: unknown[]) => io.client.emit(event, ...data),
    }
    const unregister = registerRealtimeClient(client)
    connection.client.addEventListener('close', unregister)

    io.client.on('session.identify', (_event, token: string | null) => {
      const auth = findUserByToken(token)
      client.userId = auth.status === 'authenticated' ? auth.user.id : null
    })
  }),
]
