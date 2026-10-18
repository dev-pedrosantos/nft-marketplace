import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import deletePrimary from '@/assets/icons/delete-primary.svg'
import deleteIcon from '@/assets/icons/delete.svg'
import dividerPrimary from '@/assets/ui/divider-primary.svg'
import { MobileScreenHeader } from '@/components/layout/mobile-screen-header'
import { Breadcrumb, PageShell } from '@/components/layout/page-shell'
import { FormMessage } from '@/components/ui/form-field'
import { IconFrame } from '@/components/ui/icon-frame'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useSession, useViewerKey } from '@/features/auth/session-store'
import { cartQueries, useAcceptLinePrice, useRemoveCartLine, useUpdateCartLine } from '@/features/cart/api'
import { OrderTotals } from '@/features/cart/components/order-totals'
import { PromoCode } from '@/features/cart/components/promo-code'
import type { Cart, CartLine } from '@/features/cart/types'
import { RelatedNfts } from '@/features/nfts/components/related-nfts'
import { errorMessage } from '@/lib/api/errors'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CartPage() {
  const viewer = useViewerKey()
  const query = useQuery(cartQueries.detail(viewer))
  const firstNftId = query.data?.items[0]?.nft.id

  return (
    <PageShell
      active="market"
      divider={false}
      after={
        firstNftId && (
          <RelatedNfts
            nftId={firstNftId}
            title="Colecionadores também viram"
            variant="cart"
            className="hidden md:flex"
          />
        )
      }
    >
      <div className="flex flex-col gap-3 max-md:px-7 max-md:pt-8">
        <MobileScreenHeader title="Carrinho de NFTs" />
        <Breadcrumb
          items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }, { label: 'Carrinho' }]}
        />
        <h1 className="hidden md:block md:sr-only">Carrinho de NFTs</h1>

        {!query.data ? (
          query.isPending ? (
            <CartSkeleton />
          ) : (
            <ErrorState
              message={errorMessage(query.error, 'Não foi possível carregar o carrinho.')}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          )
        ) : query.data.items.length === 0 ? (
          <EmptyState
            title="Seu carrinho está vazio"
            description="Explore o mercado e adicione NFTs para finalizar a compra."
            action={
              <Link to="/" hash="catalogo" className="text-[15px] text-highlight">
                Continuar explorando
              </Link>
            }
          />
        ) : (
          <CartContent cart={query.data} />
        )}
      </div>
    </PageShell>
  )
}

function CartContent({ cart }: { cart: Cart }) {
  const navigate = useNavigate()
  const session = useSession()
  const [blocked, setBlocked] = useState(false)
  const hasIssues = cart.items.some((line) => line.issue)

  const checkout = () => {
    if (hasIssues) {
      setBlocked(true)
      return
    }
    if (!session) {
      void navigate({
        to: '.',
        search: (previous) => ({ ...previous, auth: 'login' as const, redirect: '/checkout' }),
        resetScroll: false,
      })
      return
    }
    void navigate({ to: '/checkout' })
  }

  const blockedMessage = blocked && hasIssues && (
    <FormMessage tone="error">Revise os avisos dos itens antes de finalizar.</FormMessage>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-start justify-between gap-8 md:flex md:flex-col xl:flex-row">
        <div className="flex w-full min-w-0 flex-col gap-3 xl:w-[782px]">
          <div className="flex items-center justify-between pr-6 text-base leading-4" aria-hidden>
            <span className="w-[250px] font-bold">NFTs</span>
            <span className="w-[77px] font-medium">Preço</span>
            <span className="w-[75px] font-bold">Edições</span>
            <span className="w-[87px] font-medium">Total</span>
            <span className="w-6" />
          </div>
          <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
          <ul aria-label="Itens do carrinho" className="flex flex-col gap-3">
            {cart.items.map((line) => (
              <DesktopCartLine key={line.id} line={line} />
            ))}
          </ul>
        </div>

        <aside aria-labelledby="cart-summary-title" className="flex w-full flex-col gap-6 xl:w-[332px]">
          <div className="flex flex-col gap-3">
            <h2 id="cart-summary-title" className="text-lg leading-4 font-bold">
              Resumo da carteira
            </h2>
            <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
          </div>
          <PromoCode coupon={cart.coupon} variant="desktop" showLabel />
          <OrderTotals variant="cart" {...cart} />
          <div className="flex flex-col items-center gap-3">
            {blockedMessage}
            <button
              type="button"
              onClick={checkout}
              className="h-10 w-full rounded-[3px] bg-primary text-[15px] leading-4 font-bold text-ink"
            >
              Conectar e finalizar
            </button>
            <Link to="/" hash="catalogo" className="text-[15px] leading-[normal] text-highlight">
              Continuar explorando
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobile */}
      <div className="pb-[380px] md:hidden">
        <ul aria-label="Itens do carrinho" className="flex flex-col gap-5">
          {cart.items.map((line) => (
            <MobileCartLine key={line.id} line={line} />
          ))}
        </ul>
        <section
          aria-label="Resumo do pagamento"
          className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-8 rounded-t-[40px] bg-surface-card px-6 pt-6 pb-9"
        >
          <div className="flex flex-col gap-3">
            <PromoCode coupon={cart.coupon} variant="mobile" />
            <OrderTotals variant="mobile" {...cart} />
          </div>
          {blockedMessage}
          <button
            type="button"
            onClick={checkout}
            className="h-[60px] w-full rounded-[40px] bg-[linear-gradient(96deg,rgb(210_138_76/0.54)_0%,var(--primary)_100%)] text-base leading-4 font-bold"
          >
            Conectar e finalizar
          </button>
        </section>
      </div>
    </>
  )
}

function useLineActions(line: CartLine) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  const accept = useAcceptLinePrice()
  const error = update.error ?? remove.error ?? accept.error
  return {
    setQuantity: (quantity: number) => update.mutate({ lineId: line.id, quantity }),
    remove: () => remove.mutate(line.id),
    acceptPrice: () => accept.mutate(line.id),
    pending: update.isPending || remove.isPending || accept.isPending,
    error: error ? errorMessage(error, 'Não foi possível atualizar o item.') : null,
  }
}

function LineIssue({ line, onAcceptPrice, pending }: { line: CartLine; onAcceptPrice: () => void; pending: boolean }) {
  if (!line.issue) return null
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-coral">
      <span>{line.issue.message}</span>
      {line.issue.type === 'price-changed' && (
        <button type="button" onClick={onAcceptPrice} disabled={pending} className="font-bold text-highlight underline">
          Aceitar novo preço
        </button>
      )}
    </div>
  )
}

function DesktopCartLine({ line }: { line: CartLine }) {
  const actions = useLineActions(line)
  const soldOut = line.issue?.type === 'sold-out'

  return (
    <li className="flex flex-col gap-1.5">
      <div
        aria-busy={actions.pending}
        className={cn('flex h-[70px] items-center justify-between bg-surface-card pr-6', actions.pending && 'opacity-70')}
      >
        <div className="flex h-full w-[250px] items-center gap-4">
          <img src={line.nft.imageUrl} alt="" className="size-[70px] shrink-0 rounded-[6px] object-cover" />
          <div className="flex min-w-0 flex-col gap-1.5 leading-4">
            <Link to="/nfts/$nftId" params={{ nftId: line.nft.id }} className="truncate text-base font-bold hover:text-highlight">
              {line.nft.name}
            </Link>
            <p className="truncate text-sm text-subtle" title={`Edição ${line.editionLabel}`}>
              ID do token: {line.nft.tokenId}
              <span className="sr-only">, edição {line.editionLabel}</span>
            </p>
          </div>
        </div>
        <p className="w-[77px] text-base leading-4 font-bold whitespace-nowrap text-muted-foreground">
          <span className="sr-only">Preço unitário: </span>
          {formatEth(line.unitPriceEth)}
        </p>
        <QuantityStepper
          value={line.quantity}
          max={Math.max(line.maxQuantity, 1)}
          onChange={actions.setQuantity}
          itemLabel={line.nft.name}
          disabled={actions.pending || soldOut}
          className="w-[75px] justify-between gap-0"
        />
        <p className="w-[87px] text-base leading-4 font-bold whitespace-nowrap text-highlight">
          <span className="sr-only">Total do item: </span>
          {formatEth(line.lineTotalEth)}
        </p>
        <button
          type="button"
          aria-label={`Remover ${line.nft.name} do carrinho`}
          onClick={actions.remove}
          disabled={actions.pending}
          className="size-6"
        >
          <IconFrame
            src={deleteIcon}
            className="size-6"
            inner="inset-[11.31%_15.15%_11.68%_17.56%]"
            bleed="inset-[-4.06%_-4.64%]"
          />
        </button>
      </div>
      <LineIssue line={line} onAcceptPrice={actions.acceptPrice} pending={actions.pending} />
      {actions.error && <p role="alert" className="text-xs text-coral">{actions.error}</p>}
    </li>
  )
}

function MobileCartLine({ line }: { line: CartLine }) {
  const actions = useLineActions(line)
  const soldOut = line.issue?.type === 'sold-out'

  return (
    <li className="flex flex-col gap-1.5">
      <div
        aria-busy={actions.pending}
        className={cn(
          'relative h-[100px] rounded-[14px] bg-surface-card shadow-[0_6px_20px_rgba(10,6,4,0.45)]',
          actions.pending && 'opacity-70',
        )}
      >
        <img src={line.nft.imageUrl} alt="" className="absolute inset-y-0 left-0 size-[100px] rounded-l-[14px] object-cover" />
        <div className="absolute top-[13px] right-10 left-[109px] flex flex-col">
          <Link to="/nfts/$nftId" params={{ nftId: line.nft.id }} className="truncate text-[15px] leading-4 font-bold">
            {line.nft.name}
          </Link>
          <p className="mt-1.5 text-sm leading-4 text-muted-foreground">Edição: {line.editionLabel}</p>
        </div>
        <p className="absolute top-[69px] left-[109px] text-lg leading-4 font-bold text-highlight">
          {formatEth(line.lineTotalEth)}
        </p>
        <QuantityStepper
          size="round"
          value={line.quantity}
          max={Math.max(line.maxQuantity, 1)}
          onChange={actions.setQuantity}
          itemLabel={line.nft.name}
          disabled={actions.pending || soldOut}
          className="absolute top-[38px] right-4 gap-[13px]"
        />
        <button
          type="button"
          aria-label={`Remover ${line.nft.name} do carrinho`}
          onClick={actions.remove}
          disabled={actions.pending}
          className="absolute top-2 right-3 size-5"
        >
          <IconFrame
            src={deletePrimary}
            className="size-5"
            inner="inset-[11.31%_15.15%_11.68%_17.56%]"
            bleed="inset-[-4.06%_-4.64%]"
          />
        </button>
      </div>
      <LineIssue line={line} onAcceptPrice={actions.acceptPrice} pending={actions.pending} />
      {actions.error && <p role="alert" className="text-xs text-coral">{actions.error}</p>}
    </li>
  )
}

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="flex flex-col gap-3 md:w-[782px]">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-[100px] rounded-[14px] md:h-[70px] md:rounded-none" />
      ))}
    </div>
  )
}
