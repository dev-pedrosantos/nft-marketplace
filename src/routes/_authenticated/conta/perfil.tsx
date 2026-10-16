import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/account/profile-page'

export const Route = createFileRoute('/_authenticated/conta/perfil')({
  component: ProfilePage,
})
