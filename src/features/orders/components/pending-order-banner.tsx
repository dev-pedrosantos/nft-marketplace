import { Link, useRouterState } from '@tanstack/react-router'
import { useSession } from '@/features/auth/session-store'
import { formatEth } from '@/lib/format'
import { useOrders } from '../api'

/**
 * Recovery for payments still pending after a reload, a timeout or leaving the order page:
 * the pending orders are polled and linked from every page until they settle.
 */
export function PendingOrderBanner() {
  const session = useSession()
  const orders = useOrders()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (!session || !orders.data) return null
  const pending = orders.data.filter(
    (order) => order.status === 'pending' && pathname !== `/pedidos/${order.id}`,
  )
  if (pending.length === 0) return null
  const [latest] = pending

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-[560px] flex-wrap items-center justify-between gap-3 rounded-[8px] border border-primary bg-surface-card px-4 py-3 text-sm leading-5 shadow-[0_6px_20px_rgba(10,6,4,0.45)] md:bottom-6"
    >
      <span>
        {pending.length === 1
          ? `Pagamento de ${formatEth(latest.totalEth)} aguardando confirmação.`
          : `${pending.length} pagamentos aguardando confirmação.`}
      </span>
      <Link
        to={pending.length === 1 ? '/pedidos/$orderId' : '/conta/pedidos'}
        params={pending.length === 1 ? { orderId: latest.id } : undefined}
        className="font-bold text-highlight underline"
      >
        Acompanhar
      </Link>
    </div>
  )
}
