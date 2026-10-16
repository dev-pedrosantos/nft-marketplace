import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/pages/order/order-page'

export const Route = createFileRoute('/_authenticated/pedidos/$orderId')({
  component: function OrderRoute() {
    const { orderId } = Route.useParams()
    return <OrderPage orderId={orderId} />
  },
})
