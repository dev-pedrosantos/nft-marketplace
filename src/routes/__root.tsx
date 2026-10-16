import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { RouterDevtools } from '@/app/router-devtools'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      <RouterDevtools />
    </>
  ),
})
