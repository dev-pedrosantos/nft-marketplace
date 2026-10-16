import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'
import { env } from '@/config/env'

// Must match the `pingInterval` announced by the handshake in `toSocketIo`,
// otherwise the client drops the connection with a ping timeout.
const ENGINE_IO_PING_INTERVAL_MS = 25_000
const ENGINE_IO_PING_PACKET = '2'

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

export const socketLink = ws.link(toWebSocketUrl(env.socketUrl))

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    keepAlive(connection)
    // Register simulated realtime events on this object (io.client.on / io.client.emit).
    toSocketIo(connection)
  }),
]
