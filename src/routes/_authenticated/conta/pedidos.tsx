import { createFileRoute } from '@tanstack/react-router'
import { OrdersPage } from '@/pages/account/orders-page'

export const Route = createFileRoute('/_authenticated/conta/pedidos')({
  component: OrdersPage,
})
