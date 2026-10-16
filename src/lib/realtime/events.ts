import type { NftUpdate } from '@/features/nfts/types'
import type { OrderUpdate } from '@/features/orders/types'

export interface ServerToClientEvents {
  'nft.updated': (update: NftUpdate) => void
  'order.updated': (update: OrderUpdate) => void
}

export interface ClientToServerEvents {
  /** Associates the connection with a session so `order.updated` only reaches its owner. */
  'session.identify': (token: string | null) => void
}
