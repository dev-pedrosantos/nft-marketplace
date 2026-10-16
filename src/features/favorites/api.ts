import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession, useViewerKey } from '@/features/auth/session-store'
import type { Nft } from '@/features/nfts/types'
import { apiClient } from '@/lib/api/client'

export async function getFavorites() {
  const { data } = await apiClient.get<Nft[]>('/me/favorites')
  return data
}

export const favoriteQueries = {
  list: (viewer: string) =>
    queryOptions({
      queryKey: ['favorites', viewer],
      queryFn: getFavorites,
    }),
}

export function useFavorites() {
  const session = useSession()
  const viewer = useViewerKey()
  return useQuery({ ...favoriteQueries.list(viewer), enabled: Boolean(session) })
}

export function useIsFavorite(nftId: string) {
  const { data } = useFavorites()
  return Boolean(data?.some((nft) => nft.id === nftId))
}

/** Optimistic toggle: the heart flips immediately and rolls back if the API fails. */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()
  const queryKey = favoriteQueries.list(viewer).queryKey

  return useMutation({
    mutationFn: async ({ nft, favorite }: { nft: Nft; favorite: boolean }) => {
      if (favorite) await apiClient.put(`/me/favorites/${encodeURIComponent(nft.id)}`)
      else await apiClient.delete(`/me/favorites/${encodeURIComponent(nft.id)}`)
    },
    onMutate: async ({ nft, favorite }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Nft[]>(queryKey)
      queryClient.setQueryData<Nft[]>(queryKey, (current = []) =>
        favorite ? [nft, ...current.filter((item) => item.id !== nft.id)] : current.filter((item) => item.id !== nft.id),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
