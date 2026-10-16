import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/pages/account/wallets-page'

export const Route = createFileRoute('/_authenticated/conta/carteiras')({
  component: WalletsPage,
})
