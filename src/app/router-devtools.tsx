import { lazy, Suspense } from 'react'

const TanStackRouterDevtools = lazy(() =>
  import('@tanstack/react-router-devtools').then((module) => ({
    default: module.TanStackRouterDevtools,
  })),
)

export function RouterDevtools() {
  if (!import.meta.env.DEV) return null

  return (
    <Suspense fallback={null}>
      <TanStackRouterDevtools position="bottom-right" />
    </Suspense>
  )
}
