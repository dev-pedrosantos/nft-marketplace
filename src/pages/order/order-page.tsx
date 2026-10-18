import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import closeReceipt from '@/assets/icons/close-receipt.svg'
import thankYou from '@/assets/icons/thank-you.svg'
import dividerPrimary from '@/assets/ui/divider-primary.svg'
import dividerVertical from '@/assets/ui/divider-vertical.svg'
import { MobileScreenHeader } from '@/components/layout/mobile-screen-header'
import { Breadcrumb, PageShell } from '@/components/layout/page-shell'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { IconFrame } from '@/components/ui/icon-frame'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useViewerKey } from '@/features/auth/session-store'
import { OrderTotals } from '@/features/cart/components/order-totals'
import { orderQueries } from '@/features/orders/api'
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge'
import type { Order } from '@/features/orders/types'
import { toApiError, errorMessage } from '@/lib/api/errors'
import { formatEth, formatReceiptDate, shortenHash } from '@/lib/format'

/** After this the page says the payment is taking longer and that it is safe to leave. */
const STILL_PENDING_AFTER_MS = 30_000

export function OrderPage({ orderId }: { orderId: string }) {
  const viewer = useViewerKey()
  const query = useQuery(orderQueries.detail(viewer, orderId))

  return (
    <PageShell active="market" divider={false}>
      <div className="flex flex-col gap-6 max-md:px-7 max-md:pt-8">
        <MobileScreenHeader title="Pedido" />
        <Breadcrumb
          items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }, { label: 'Pedido' }]}
        />
        {query.data ? (
          <OrderView order={query.data} refreshFailed={query.isError} />
        ) : query.isPending ? (
          <div role="status" aria-label="Carregando pedido" className="flex flex-col gap-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-[220px]" />
          </div>
        ) : toApiError(query.error).status === 404 ? (
          <EmptyState
            title="Pedido não encontrado"
            description="Este pedido não existe ou pertence a outra conta."
            action={
              <Link to="/conta/pedidos" className="text-[15px] text-highlight">
                Ver meus pedidos
              </Link>
            }
          />
        ) : (
          <ErrorState
            message={errorMessage(query.error, 'Não foi possível carregar o pedido.')}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        )}
      </div>
    </PageShell>
  )
}

function OrderView({ order, refreshFailed }: { order: Order; refreshFailed: boolean }) {
  return (
    <div className="flex flex-col gap-6 md:max-w-[782px]">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl leading-6 font-bold">Pedido {order.id.slice(-8).toUpperCase()}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div aria-live="polite">
        {order.status === 'pending' && <PendingNotice order={order} refreshFailed={refreshFailed} />}
        {order.status === 'failed' && <FailedNotice order={order} />}
        {order.status === 'confirmed' && (
          <p className="text-sm leading-[22px] text-muted-foreground">
            Pagamento confirmado em {formatReceiptDate(order.updatedAt)}.
          </p>
        )}
      </div>

      <OrderLines order={order} />
      <div className="md:ml-auto md:w-[332px]">
        <OrderTotals variant="cart" {...order} />
      </div>

      {order.status === 'confirmed' && <ConfirmationDialog order={order} />}
    </div>
  )
}

function PendingNotice({ order, refreshFailed }: { order: Order; refreshFailed: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  const elapsed = now - Date.parse(order.createdAt)
  const slow = elapsed >= STILL_PENDING_AFTER_MS

  useEffect(() => {
    if (slow) return
    const timer = setTimeout(() => setNow(Date.now()), STILL_PENDING_AFTER_MS - elapsed)
    return () => clearTimeout(timer)
  }, [elapsed, slow])

  return (
    <div className="flex items-start gap-3 rounded-[8px] border border-border p-4">
      <span
        aria-hidden
        className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
      <div className="flex flex-col gap-1 text-sm leading-[22px]">
        <p className="font-bold">Aguardando a confirmação do pagamento na carteira {order.walletLabel}.</p>
        <p className="text-muted-foreground">
          {slow
            ? 'O pagamento está demorando mais que o normal. Você pode sair desta página: o pedido continua sendo acompanhado e o status é atualizado em Atividade.'
            : 'Isso costuma levar alguns segundos. Não feche a carteira.'}
        </p>
        {refreshFailed && (
          <p className="text-coral">
            Sem conexão com o servidor no momento. O status é atualizado assim que a conexão voltar.
          </p>
        )}
        {slow && (
          <Link to="/conta/pedidos" className="w-fit font-bold text-highlight underline">
            Ver meus pedidos
          </Link>
        )}
      </div>
    </div>
  )
}

function FailedNotice({ order }: { order: Order }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-[8px] border border-coral p-4 text-sm leading-[22px]">
      <p>
        <span className="font-bold text-coral">Pagamento não concluído.</span>{' '}
        {order.failureReason ?? 'A carteira não confirmou o pagamento.'}
      </p>
      <p className="text-muted-foreground">Os itens continuam no seu carrinho e as edições foram liberadas.</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/checkout" className="grid h-10 place-items-center rounded-[3px] bg-primary px-4 font-bold text-ink">
          Tentar novamente
        </Link>
        <Link to="/carrinho" className="grid h-10 place-items-center rounded-[3px] border border-border px-4 font-medium">
          Voltar ao carrinho
        </Link>
      </div>
    </div>
  )
}

function OrderLines({ order, compact = false }: { order: Order; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base leading-4" aria-hidden>
        <span>NFTs</span>
        <span className="flex gap-12">
          <span className="font-bold">Edições</span>
          <span className="font-medium">Subtotal</span>
        </span>
      </div>
      <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
      <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
        {order.items.map((line) => (
          <li
            key={`${line.nftId}-${line.editionId}`}
            className="flex min-h-[70px] items-center justify-between gap-3 md:h-[70px]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img src={line.imageUrl} alt="" className="size-14 shrink-0 rounded-[8px] object-cover md:size-[70px]" />
              <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                <p className="text-base font-bold break-words md:truncate">{line.name}</p>
                <p className="text-sm text-subtle md:truncate">
                  ID do token: {line.tokenId}
                  {!compact && ` • ${line.editionLabel}`}
                </p>
              </div>
            </div>
            <p className="flex shrink-0 flex-col items-end gap-1.5 leading-4 whitespace-nowrap md:flex-row md:items-center md:gap-12">
              <span className="text-sm text-muted-foreground">
                <span className="sr-only">Quantidade: </span>(x {line.quantity})
              </span>
              <span className="text-lg font-bold text-highlight">{formatEth(line.lineTotalEth)}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConfirmationDialog({ order }: { order: Order }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [explorerNotice, setExplorerNotice] = useState(false)

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) void navigate({ to: '/conta/pedidos' })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="max-w-[578px]"
        overlayClassName="bg-ink"
        closeLabel="Fechar comprovante"
        closeIconSrc={closeReceipt}
        closeClassName="top-[17px] right-[14px] h-[17.35px] w-[18px]"
      >
        <header className="flex h-[156px] flex-col items-center justify-center gap-4">
          <IconFrame src={thankYou} className="size-20" inner="inset-[0_9.27%]" />
          <DialogTitle className="sr-only">Compra confirmada</DialogTitle>
          <DialogDescription className="px-6 text-center text-base leading-4 font-bold text-muted-foreground">
            Seus NFTs agora estão na sua carteira
          </DialogDescription>
        </header>
        <div className="h-px bg-primary" />
        <div className="grid grid-cols-2 gap-4 px-6 py-3 text-muted-foreground md:flex md:h-[65px] md:items-center md:justify-between md:gap-0 md:px-9 md:py-1">
          <ReceiptMeta label="ID da transação" bold className="md:min-w-[127px]">
            {order.transactionHash ? shortenHash(order.transactionHash) : '—'}
          </ReceiptMeta>
          <ReceiptDivider />
          <ReceiptMeta label="Data" className="md:min-w-[109px]">
            {formatReceiptDate(order.updatedAt)}
          </ReceiptMeta>
          <ReceiptDivider />
          <ReceiptMeta label="Total" className="md:min-w-[91px]">
            {formatEth(order.totalEth)}
          </ReceiptMeta>
          <ReceiptDivider />
          <ReceiptMeta label="Carteira" bold className="md:min-w-[73px]">
            {order.walletLabel}
          </ReceiptMeta>
        </div>
        <div className="h-px bg-primary" />
        <section className="flex flex-col gap-3 px-6 pt-5 pb-12 md:px-11">
          <h2 className="text-[15px] leading-4 font-bold">Detalhes da transação</h2>
          <OrderLines order={order} compact />
          <div className="ml-auto flex w-full max-w-[321px] flex-col gap-3">
            <p className="flex items-center justify-between whitespace-nowrap">
              <span className="text-[15px]">Taxa de rede</span>
              <span className="text-lg leading-4">{formatEth(order.networkFeeEth)}</span>
            </p>
            <p className="flex items-center justify-between leading-4 font-bold whitespace-nowrap">
              <span className="text-base">Total</span>
              <span className="text-lg text-highlight">{formatEth(order.totalEth)}</span>
            </p>
          </div>
          <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
          <div className="flex flex-col items-center gap-6 pt-3">
            <p className="text-center text-sm leading-[22px] text-muted-foreground">
              Transação confirmada na {order.networkLabel}. A propriedade foi transferida para sua carteira conectada
              e registrada na rede.
            </p>
            <button
              type="button"
              onClick={() => setExplorerNotice(true)}
              aria-describedby={explorerNotice ? 'explorer-notice' : undefined}
              className="rounded-[5px] bg-primary p-4 text-base leading-4 font-bold text-ink"
            >
              Ver no Etherscan
            </button>
            <p id="explorer-notice" role="status" className="min-h-4 text-center text-xs leading-4 text-subtle">
              {explorerNotice &&
                'Ambiente de demonstração: o pagamento e a transação são simulados pela API mockada e não existem no Etherscan.'}
            </p>
          </div>
        </section>
        <div className="h-2.5 bg-primary" />
      </DialogContent>
    </Dialog>
  )
}

/** The divider asset is horizontal; a rotated image keeps its 31px layout width, so it is wrapped. */
function ReceiptDivider() {
  return (
    <span className="mx-1.5 hidden w-px justify-center md:flex">
      <img src={dividerVertical} alt="" className="h-px w-[31px] max-w-none shrink-0 rotate-90" />
    </span>
  )
}

function ReceiptMeta({
  label,
  bold,
  className,
  children,
}: {
  label: string
  bold?: boolean
  className?: string
  children: string
}) {
  return (
    <div className={className}>
      <p className={bold ? 'text-sm leading-4 font-bold' : 'text-sm leading-4'}>{label}</p>
      <p className="mt-1 text-[15px] leading-5 whitespace-nowrap">{children}</p>
    </div>
  )
}
