import type { NftUpdate } from '@/features/nfts/types'
import type { OrderUpdate } from '@/features/orders/types'

interface RealtimeClient {
  emit: (event: string, ...data: unknown[]) => void
  userId: string | null
}

const clients = new Set<RealtimeClient>()

export function registerRealtimeClient(client: RealtimeClient) {
  clients.add(client)
  return () => {
    clients.delete(client)
  }
}

export function realtimeClientCount() {
  return clients.size
}

export function broadcastNftUpdate(update: NftUpdate) {
  for (const client of clients) client.emit('nft.updated', update)
}

/** Order events only reach the connections identified as the order owner. */
export function notifyOrderUpdate(userId: string, update: OrderUpdate) {
  for (const client of clients) {
    if (client.userId === userId) client.emit('order.updated', update)
  }
}
