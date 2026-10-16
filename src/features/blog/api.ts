import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { BlogPost } from './types'

export async function getLatestPosts(limit: number) {
  const { data } = await apiClient.get<BlogPost[]>('/posts', {
    params: { limit },
  })
  return data
}

export const blogQueries = {
  latest: (limit: number) =>
    queryOptions({
      queryKey: ['posts', 'latest', limit],
      queryFn: () => getLatestPosts(limit),
    }),
}
