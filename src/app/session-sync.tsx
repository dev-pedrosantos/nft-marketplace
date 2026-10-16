import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { USER_SCOPED_QUERY_ROOTS } from '@/features/auth/api'
import { useSessionState } from '@/features/auth/session-store'

/**
 * Reacts to session changes from any source (logout, expiry, another tab):
 * drops the previous account's cached data and leaves private routes.
 */
export function SessionSync() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { session, expired, returnTo } = useSessionState()
  const userId = session?.user.id ?? null
  const previousUserId = useRef(userId)

  useEffect(() => {
    const previous = previousUserId.current
    previousUserId.current = userId
    if (previous === userId) return

    if (previous) {
      queryClient.removeQueries({
        predicate: (query) =>
          (USER_SCOPED_QUERY_ROOTS as readonly unknown[]).includes(query.queryKey[0]) &&
          query.queryKey[1] === previous,
      })
    }
    // The guest cart was merged into the account (or the account cart is gone).
    void queryClient.invalidateQueries({ queryKey: ['cart'] })

    if (!userId) {
      const isPrivate = router.state.matches.some((match) => match.routeId.startsWith('/_authenticated'))
      if (isPrivate) {
        void router.navigate({
          to: '/',
          search: expired ? { auth: 'login', redirect: returnTo ?? router.state.location.href } : {},
          replace: true,
        })
      }
    } else {
      // Route guards and loaders depend on the session.
      void router.invalidate()
    }
  }, [expired, queryClient, returnTo, router, userId])

  return null
}
