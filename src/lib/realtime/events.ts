import type { NftUpdate } from '@/features/nfts/types'
import type { OrderUpdate } from '@/features/orders/types'

/** Added by the server to every event. A redelivered event keeps its `eventId`. */
export interface EventMeta {
  eventId: string
  occurredAt: string
}

export type RealtimeEvent<T> = T & EventMeta

export interface ServerToClientEvents {
  'nft.updated': (update: RealtimeEvent<NftUpdate>) => void
  'order.updated': (update: RealtimeEvent<OrderUpdate>) => void
}

export interface ClientToServerEvents {
  /** Associates the connection with a session so `order.updated` only reaches its owner. */
  'session.identify': (token: string | null) => void
}
