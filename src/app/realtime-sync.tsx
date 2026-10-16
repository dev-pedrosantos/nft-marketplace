import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from '@/features/auth/session-store'
import type { Nft, NftDetails, NftUpdate } from '@/features/nfts/types'
import type { Order, OrderUpdate } from '@/features/orders/types'
import { useSocketConnection } from '@/lib/realtime/use-socket-connection'

function patchNftCaches(queryClient: QueryClient, update: NftUpdate) {
  queryClient.setQueryData<NftDetails>(['nfts', 'detail', update.id], (current) => {
    // Events can arrive out of order; an older version never overwrites a newer one.
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

  const patchItem = (nft: Nft) => (nft.id === update.id ? { ...nft, priceEth: update.priceEth } : nft)
  queryClient.setQueriesData<{ items: Nft[] }>({ queryKey: ['nfts', 'list'] }, (current) =>
    current ? { ...current, items: current.items.map(patchItem) } : current,
  )
  queryClient.setQueriesData<Nft[]>({ queryKey: ['nfts', 'related'] }, (current) => current?.map(patchItem))
  queryClient.setQueriesData<Nft[]>({ queryKey: ['favorites'] }, (current) => current?.map(patchItem))

  // Cart lines carry server-computed issues (price change, stock), so they are refetched.
  void queryClient.invalidateQueries({ queryKey: ['cart'] })
}

function applyOrderUpdate(queryClient: QueryClient, update: OrderUpdate) {
  queryClient.setQueriesData<Order>({ queryKey: ['orders'], predicate: (query) => query.queryKey.includes(update.id) }, (current) =>
    current && current.id === update.id ? { ...current, status: update.status, updatedAt: update.updatedAt } : current,
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
    const onNft = (update: NftUpdate) => patchNftCaches(queryClient, update)
    const onOrder = (update: OrderUpdate) => applyOrderUpdate(queryClient, update)
    socket.on('nft.updated', onNft)
    socket.on('order.updated', onOrder)
    return () => {
      socket.off('nft.updated', onNft)
      socket.off('order.updated', onOrder)
    }
  }, [queryClient, socket])

  useEffect(() => {
    if (isConnected) socket.emit('session.identify', token)
  }, [isConnected, socket, token])

  return null
}
