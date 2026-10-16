import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/pages/account/favorites-page'

export const Route = createFileRoute('/_authenticated/conta/favoritos')({
  component: FavoritesPage,
})
