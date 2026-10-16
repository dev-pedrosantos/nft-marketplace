import { io, type Socket } from 'socket.io-client'
import { env } from '@/config/env'
import type { ClientToServerEvents, ServerToClientEvents } from './events'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  socket ??= io(env.socketUrl, {
    autoConnect: false,
    // MSW can only intercept the WebSocket transport, not HTTP long-polling.
    transports: ['websocket'],
  })
  return socket
}

export function connectSocket(): AppSocket {
  const instance = getSocket()
  if (!instance.connected) instance.connect()
  return instance
}

export function disconnectSocket(): void {
  socket?.disconnect()
}
