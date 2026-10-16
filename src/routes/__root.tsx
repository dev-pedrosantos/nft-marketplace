import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { RealtimeSync } from '@/app/realtime-sync'
import { parseRootSearch } from '@/app/root-search'
import { RouterDevtools } from '@/app/router-devtools'
import type { RouterContext } from '@/app/router'
import { SessionSync } from '@/app/session-sync'
import { AuthDialog } from '@/features/auth/components/auth-dialog'
import { PendingOrderBanner } from '@/features/orders/components/pending-order-banner'

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: parseRootSearch,
  component: () => (
    <>
      <Outlet />
      <AuthDialog />
      <PendingOrderBanner />
      <RealtimeSync />
      <SessionSync />
      <RouterDevtools />
    </>
  ),
})
