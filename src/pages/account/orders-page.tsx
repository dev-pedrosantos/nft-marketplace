import { Link } from '@tanstack/react-router'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { AccountLayout } from '@/features/account/components/account-layout'
import { useOrders } from '@/features/orders/api'
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge'
import { errorMessage } from '@/lib/api/errors'
import { formatEth, formatReceiptDate } from '@/lib/format'

export function OrdersPage() {
  const query = useOrders()

  return (
    <AccountLayout section="orders">
      <section aria-labelledby="orders-title" className="flex flex-col gap-8">
        <h1 id="orders-title" className="text-base leading-4 font-bold">
          Atividade
        </h1>
        {query.isPending ? (
          <div role="status" aria-label="Carregando pedidos" className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[70px] rounded-none" />
            ))}
          </div>
        ) : query.isError && !query.data ? (
          <ErrorState
            message={errorMessage(query.error, 'Não foi possível carregar seus pedidos.')}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="Nenhum pedido ainda"
            description="Suas compras aparecem aqui com o status do pagamento."
            action={
              <Link to="/" hash="catalogo" className="text-sm font-bold text-highlight">
                Explorar o mercado
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {query.data.map((order) => {
              const [first] = order.items
              const units = order.items.reduce((total, item) => total + item.quantity, 0)
              return (
                <li key={order.id}>
                  <Link
                    to="/pedidos/$orderId"
                    params={{ orderId: order.id }}
                    className="flex min-h-[70px] items-center gap-4 bg-surface-card py-2 pr-4 pl-1 hover:outline hover:outline-1 hover:outline-primary md:pr-6"
                  >
                    {first && <img src={first.imageUrl} alt="" className="size-[62px] shrink-0 rounded-[6px] object-cover" />}
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-base leading-4 font-bold">
                        {first?.name}
                        {order.items.length > 1 && ` + ${order.items.length - 1}`}
                      </span>
                      <span className="text-sm leading-4 text-subtle">
                        {formatReceiptDate(order.createdAt)} • {units} {units === 1 ? 'item' : 'itens'}
                      </span>
                    </span>
                    <OrderStatusBadge status={order.status} className="max-sm:hidden" />
                    <span className="text-base leading-4 font-bold text-highlight">{formatEth(order.totalEth)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </AccountLayout>
  )
}
