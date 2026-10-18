import type { NftUpdate } from '@/features/nfts/types'
import type { OrderUpdate } from '@/features/orders/types'
import type { RealtimeEvent } from '@/lib/realtime/events'
import { isScenarioActive } from './scenarios'

interface RealtimeClient {
  emit: (event: string, ...data: unknown[]) => void
  close: () => void
  userId: string | null
}

interface PublishedEvent {
  name: 'nft.updated' | 'order.updated'
  entityId: string
  payload: RealtimeEvent<NftUpdate> | RealtimeEvent<OrderUpdate>
  /** `null` reaches every connection; otherwise only the owner's. */
  userId: string | null
}

const HISTORY_LIMIT = 100
const REDELIVERY_DELAY_MS = 100

const clients = new Set<RealtimeClient>()
const history: PublishedEvent[] = []

export function registerRealtimeClient(client: RealtimeClient) {
  clients.add(client)
  return () => {
    clients.delete(client)
  }
}

export function realtimeClientCount() {
  return clients.size
}

/** Closes every socket, as a network drop would; clients reconnect on their own. */
export function dropRealtimeConnections() {
  for (const client of [...clients]) client.close()
}

function deliver(event: PublishedEvent) {
  for (const client of clients) {
    if (event.userId === null || client.userId === event.userId) client.emit(event.name, event.payload)
  }
}

function publish(name: PublishedEvent['name'], entityId: string, update: NftUpdate | OrderUpdate, userId: string | null) {
  const previous = history.findLast((item) => item.name === name && item.entityId === entityId)
  const event: PublishedEvent = {
    name,
    entityId,
    payload: { ...update, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() },
    userId,
  }
  history.push(event)
  if (history.length > HISTORY_LIMIT) history.shift()
  deliver(event)

  if (isScenarioActive('unreliable-events')) {
    // At-least-once delivery without ordering guarantees: a duplicate, then an older event.
    setTimeout(() => {
      deliver(event)
      if (previous) deliver(previous)
    }, REDELIVERY_DELAY_MS)
  }
}

export function broadcastNftUpdate(update: NftUpdate) {
  publish('nft.updated', update.id, update, null)
}

/** Order events only reach the connections identified as the order owner. */
export function notifyOrderUpdate(userId: string, update: OrderUpdate) {
  publish('order.updated', update.id, update, userId)
}

/** Sends a past event again, unchanged (same `eventId`), to its original audience. */
export function redeliverEvent(eventId: string) {
  const event = history.find((item) => item.payload.eventId === eventId)
  if (event) deliver(event)
  return Boolean(event)
}
