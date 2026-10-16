import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/features/auth/session-store'

/** Pathless layout guarding every private screen. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.get().session) {
      throw redirect({ to: '/', search: { auth: 'login', redirect: location.href } })
    }
  },
  component: Outlet,
})
