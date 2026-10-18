import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from '@/features/auth/session-store'
import type { Nft, NftDetails, NftUpdate } from '@/features/nfts/types'
import type { Order, OrderStatus, OrderUpdate } from '@/features/orders/types'
import type { RealtimeEvent } from '@/lib/realtime/events'
import { useSocketConnection } from '@/lib/realtime/use-socket-connection'

const SEEN_EVENTS_LIMIT = 500
const FINAL_ORDER_STATUSES: OrderStatus[] = ['confirmed', 'failed']
/** Caches that realtime events keep fresh. Events missed while disconnected are not replayed. */
const REALTIME_QUERY_ROOTS = ['nfts', 'cart', 'orders', 'favorites'] as const

/**
 * Delivery is at least once and unordered: an event is applied only the first time its id is
 * seen and only if its version is newer than the last one applied for the same item.
 */
function createEventGate() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()
  return (key: string, { eventId, version }: { eventId: string; version: number }) => {
    if (seen.has(eventId)) return false
    seen.add(eventId)
    if (seen.size > SEEN_EVENTS_LIMIT) seen.delete(seen.values().next().value!)
    if ((versions.get(key) ?? 0) >= version) return false
    versions.set(key, version)
    return true
  }
}

function patchNftCaches(queryClient: QueryClient, update: NftUpdate) {
  queryClient.setQueryData<NftDetails>(['nfts', 'detail', update.id], (current) => {
    // The cache may already hold a newer version fetched over HTTP.
    if (!current || current.version >= update.version) return current
    const available = new Map(update.editions.map((edition) => [edition.id, edition.available]))
    return {
      ...current,
      priceEth: update.priceEth,
      version: update.version,
      editions: current.editions.map((edition) => ({
        ...edition,
        available: available.get(edition.id) ?? edition.available,
      })),
    }
  })

  const patchItem = (nft: Nft) =>
    nft.id === update.id && nft.version < update.version
      ? { ...nft, priceEth: update.priceEth, version: update.version }
      : nft
  queryClient.setQueriesData<{ items: Nft[] }>({ queryKey: ['nfts', 'list'] }, (current) =>
    current ? { ...current, items: current.items.map(patchItem) } : current,
  )
  queryClient.setQueriesData<Nft[]>({ queryKey: ['nfts', 'related'] }, (current) => current?.map(patchItem))
  queryClient.setQueriesData<Nft[]>({ queryKey: ['favorites'] }, (current) => current?.map(patchItem))

  // Cart lines carry server-computed issues (price change, stock), so they are refetched.
  void queryClient.invalidateQueries({ queryKey: ['cart'] })
}

function applyOrderUpdate(queryClient: QueryClient, update: OrderUpdate) {
  const patch = (order: Order) =>
    order.id === update.id &&
    order.version < update.version &&
    // A final status never changes, whatever arrives late.
    !FINAL_ORDER_STATUSES.includes(order.status)
      ? { ...order, status: update.status, updatedAt: update.updatedAt, version: update.version }
      : order
  queryClient.setQueriesData<Order | Order[]>({ queryKey: ['orders'] }, (current) =>
    Array.isArray(current) ? current.map(patch) : current && patch(current),
  )
  void queryClient.invalidateQueries({ queryKey: ['orders'] })
  // A confirmed order removes the purchased lines from the cart; stock changed too.
  void queryClient.invalidateQueries({ queryKey: ['cart'] })
}

export function RealtimeSync() {
  const queryClient = useQueryClient()
  const { socket, isConnected } = useSocketConnection()
  const token = useSession()?.token ?? null

  useEffect(() => {
    const accept = createEventGate()
    const onNft = (update: RealtimeEvent<NftUpdate>) => {
      if (accept(`nft:${update.id}`, update)) patchNftCaches(queryClient, update)
    }
    const onOrder = (update: RealtimeEvent<OrderUpdate>) => {
      if (accept(`order:${update.id}`, update)) applyOrderUpdate(queryClient, update)
    }
    const onReconnect = () => {
      for (const root of REALTIME_QUERY_ROOTS) void queryClient.invalidateQueries({ queryKey: [root] })
    }
    socket.on('nft.updated', onNft)
    socket.on('order.updated', onOrder)
    socket.io.on('reconnect', onReconnect)
    return () => {
      socket.off('nft.updated', onNft)
      socket.off('order.updated', onOrder)
      socket.io.off('reconnect', onReconnect)
    }
  }, [queryClient, socket])

  useEffect(() => {
    if (isConnected) socket.emit('session.identify', token)
  }, [isConnected, socket, token])

  return null
}
