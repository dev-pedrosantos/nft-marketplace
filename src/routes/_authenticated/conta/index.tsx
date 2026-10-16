import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/conta/')({
  beforeLoad: () => {
    throw redirect({ to: '/conta/perfil', replace: true })
  },
})
