import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import arrowLeft from '@/assets/icons/arrow-left.svg'
import heartOutline from '@/assets/icons/heart-outline.svg'
import heartPrimary from '@/assets/icons/heart-primary.svg'
import shareLinkedin from '@/assets/icons/share-linkedin.svg'
import shareMessage from '@/assets/icons/share-message.svg'
import shareTwitter from '@/assets/icons/share-twitter.svg'
import shopIcon from '@/assets/icons/shop.svg'
import starAmber from '@/assets/icons/star-amber.svg'
import starEmpty from '@/assets/icons/star-empty.svg'
import starFilled from '@/assets/icons/star-filled.svg'
import zoomIcon from '@/assets/icons/zoom.svg'
import dividerPrimary from '@/assets/ui/divider-primary.svg'
import galleryDots from '@/assets/ui/gallery-dots.svg'
import tabUnderlineWide from '@/assets/ui/tab-underline-wide.svg'
import { Breadcrumb, PageShell } from '@/components/layout/page-shell'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FormMessage } from '@/components/ui/form-field'
import { IconFrame } from '@/components/ui/icon-frame'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useSession } from '@/features/auth/session-store'
import { useAddToCart } from '@/features/cart/api'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/api'
import { nftQueries } from '@/features/nfts/api'
import { EditionPicker } from '@/features/nfts/components/edition-picker'
import { RelatedNfts } from '@/features/nfts/components/related-nfts'
import type { EditionId, NftDetails } from '@/features/nfts/types'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Same ceiling the API enforces per cart line. */
const MAX_PER_PURCHASE = 10

export function NftDetailsPage({ nftId }: { nftId: string }) {
  const query = useQuery(nftQueries.detail(nftId))

  if (query.isPending) {
    return (
      <PageShell active="market" divider={false}>
        <DetailsSkeleton />
      </PageShell>
    )
  }

  if (query.isError) {
    const notFound = toApiError(query.error).status === 404
    return (
      <PageShell active="market" divider={false}>
        {notFound ? (
          <EmptyState
            title="NFT não encontrado"
            description="Este item não existe ou foi removido do mercado."
            action={
              <Link to="/" className="font-bold text-highlight">
                Voltar ao mercado
              </Link>
            }
          />
        ) : (
          <ErrorState
            message={errorMessage(query.error, 'Não foi possível carregar este NFT.')}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        )}
      </PageShell>
    )
  }

  return <NftDetailsView key={nftId} nft={query.data} />
}

function NftDetailsView({ nft }: { nft: NftDetails }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const session = useSession()
  const addToCart = useAddToCart()
  const toggleFavorite = useToggleFavorite()
  const isFavorite = useIsFavorite(nft.id)

  const [editionId, setEditionId] = useState<EditionId>(() => pickEdition(nft, nft.defaultEditionId))
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const edition = nft.editions.find((item) => item.id === editionId) ?? nft.editions[0]
  const maxQuantity = Math.max(1, Math.min(edition.available, MAX_PER_PURCHASE))
  const soldOut = edition.available === 0

  // Realtime updates can lower stock under the user; keep the selection valid.
  const effectiveQuantity = Math.min(quantity, maxQuantity)

  const seenPrice = useRef(nft.priceEth)
  useEffect(() => {
    if (seenPrice.current !== nft.priceEth) {
      setNotice({
        tone: 'success',
        text: `O preço foi atualizado de ${formatEth(seenPrice.current)} para ${formatEth(nft.priceEth)}.`,
      })
      seenPrice.current = nft.priceEth
    }
  }, [nft.priceEth])

  const requireSession = () => {
    if (session) return true
    void navigate({
      to: '.',
      search: (previous) => ({ ...previous, auth: 'login' as const, redirect: location.href }),
      resetScroll: false,
    })
    return false
  }

  const onFavorite = () => {
    if (!requireSession()) return
    toggleFavorite.mutate(
      { nft, favorite: !isFavorite },
      { onError: (error) => setNotice({ tone: 'error', text: errorMessage(error, 'Não foi possível atualizar os favoritos.') }) },
    )
  }

  const add = (then: 'cart' | 'stay') => {
    setNotice(null)
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: effectiveQuantity },
      {
        onSuccess: () => {
          if (then === 'cart') void navigate({ to: '/carrinho' })
          else setNotice({ tone: 'success', text: `${nft.name} foi adicionado ao carrinho.` })
        },
        onError: (error) => {
          setNotice({ tone: 'error', text: errorMessage(error, 'Não foi possível adicionar ao carrinho.') })
          void queryClient.invalidateQueries({ queryKey: nftQueries.detail(nft.id).queryKey })
        },
      },
    )
  }

  const pending = addToCart.isPending
  const buyLabel = soldOut ? 'ESGOTADO' : pending ? 'ADICIONANDO…' : 'COMPRAR'

  return (
    <PageShell
      active="market"
      divider={false}
      after={
        <>
          <DescriptionSection nft={nft} className="hidden md:flex" />
          <RelatedNfts nftId={nft.id} title="Mais desta coleção" className="max-md:px-6 max-md:pb-48" />
        </>
      }
    >
      {/* Desktop */}
      <div className="hidden flex-col gap-3 md:flex">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }]} />
        <div className="flex flex-col gap-8 lg:flex-row">
          <Gallery nft={nft} />

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <h1 className="text-[28px] leading-[normal] font-bold">{nft.name}</h1>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[22px] leading-4 font-bold text-highlight">{formatEth(nft.priceEth)}</p>
                  <Rating nft={nft} />
                </div>
              </div>
              <img src={dividerPrimary} alt="" className="block h-px w-full max-w-[573px] opacity-40" />
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-muted-foreground">{nft.summary}</p>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] leading-4 font-bold">Edição:</h2>
              <EditionPicker editions={nft.editions} value={edition.id} onChange={(id) => setEditionId(id)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <QuantityStepper
                size="lg"
                value={effectiveQuantity}
                max={maxQuantity}
                onChange={setQuantity}
                itemLabel={nft.name}
                disabled={soldOut}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={soldOut || pending}
                  aria-busy={pending}
                  onClick={() => add('cart')}
                  className="h-10 w-[130px] rounded-[6px] bg-primary text-sm leading-5 font-bold text-ink disabled:opacity-60"
                >
                  {buyLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={isFavorite}
                  onClick={onFavorite}
                  className={cn(
                    'flex h-10 w-[130px] items-center justify-center gap-2 rounded-[6px] border border-primary text-sm leading-5 font-medium text-highlight',
                    isFavorite && 'bg-primary/15',
                  )}
                >
                  <img src={heartPrimary} alt="" className="size-5" />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </button>
              </div>
            </div>

            {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}

            <div className="flex flex-col gap-3">
              <TokenInfo nft={nft} />
              <ShareLinks nft={nft} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <MobileDetails
        nft={nft}
        editionId={edition.id}
        onEditionChange={setEditionId}
        quantity={effectiveQuantity}
        maxQuantity={maxQuantity}
        onQuantityChange={setQuantity}
        soldOut={soldOut}
        pending={pending}
        isFavorite={isFavorite}
        onFavorite={onFavorite}
        onBuy={() => add('cart')}
        onAddToCart={() => add('stay')}
        notice={notice}
      />
    </PageShell>
  )
}

function pickEdition(nft: NftDetails, preferred: EditionId): EditionId {
  const preferredEdition = nft.editions.find((edition) => edition.id === preferred)
  if (preferredEdition && preferredEdition.available > 0) return preferred
  return nft.editions.find((edition) => edition.available > 0)?.id ?? preferred
}

function Gallery({ nft }: { nft: NftDetails }) {
  const [selected, setSelected] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const image = nft.gallery[selected] ?? nft.imageUrl

  return (
    <div className="relative flex shrink-0 items-center gap-7 lg:h-[448px] lg:w-[573px]">
      <ul aria-label="Imagens do NFT" className="flex w-[100px] shrink-0 flex-col gap-4">
        {nft.gallery.map((src, index) => (
          <li key={index} className="size-[100px] rounded-[6px] bg-surface-card">
            <button
              type="button"
              aria-label={`Ver imagem ${index + 1} de ${nft.gallery.length}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={cn(
                'block size-full overflow-hidden rounded-[8px] border',
                selected === index ? 'border-primary' : 'border-transparent',
              )}
            >
              <img src={src} alt="" className="size-full rounded-[8px] object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex size-[444px] shrink-0 items-center justify-center rounded-[6px] bg-surface-card p-4">
        <img src={image} alt={nft.name} className="size-[404px] rounded-[24px] object-cover" />
      </div>

      <button
        type="button"
        aria-label="Ampliar imagem"
        onClick={() => setZoomed(true)}
        className="absolute top-[15px] left-[530px] size-[30px]"
      >
        <img src={zoomIcon} alt="" className="size-full" />
      </button>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="w-auto max-w-[min(90vw,900px)] rounded-[12px] p-6">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <img src={image} alt={nft.name} className="max-h-[80dvh] w-full rounded-[16px] object-contain" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Rating({ nft }: { nft: NftDetails }) {
  const filled = Math.floor(Number(nft.rating.average))
  return (
    <p className="flex items-center gap-1 text-[15px] leading-[normal]">
      <span className="sr-only">Nota {nft.rating.average} de 5. </span>
      {Array.from({ length: 5 }, (_, index) => (
        <IconFrame
          key={index}
          src={index < filled ? starFilled : starEmpty}
          className="size-[15px]"
          inner="inset-[10.42%_8.32%_10.41%_8.33%]"
        />
      ))}
      {nft.rating.count} avaliações de colecionadores
    </p>
  )
}

function TokenInfo({ nft, className }: { nft: NftDetails; className?: string }) {
  return (
    <dl className={cn('flex flex-col gap-3 text-[15px] leading-[normal] text-subtle', className)}>
      <div className="flex gap-1">
        <dt>ID do token:</dt>
        <dd>{nft.tokenId}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Coleção:</dt>
        <dd>{nft.collection.name}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Atributos:</dt>
        <dd>{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

function ShareLinks({ nft }: { nft: NftDetails }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = encodeURIComponent(`${nft.name} na Kurio`)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</p>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Compartilhar no LinkedIn"
      >
        <img src={shareLinkedin} alt="" className="h-[14.375px] w-[15px]" />
      </a>
      <button type="button" onClick={copy} aria-label="Copiar link">
        <img src={shareMessage} alt="" className="size-[18px]" />
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Compartilhar no Twitter"
      >
        <img src={shareTwitter} alt="" className="h-[12.191px] w-[15.966px]" />
      </a>
      <span role="status" className="text-xs text-highlight">
        {copied ? 'Link copiado.' : ''}
      </span>
    </div>
  )
}

function DescriptionSection({ nft, className }: { nft: NftDetails; className?: string }) {
  const [tab, setTab] = useState<'details' | 'reviews'>('details')

  return (
    <section aria-label="Informações do NFT" className={cn('flex flex-col gap-3', className)}>
      <div>
        <div role="tablist" className="flex items-start gap-8">
          <DescriptionTab active={tab === 'details'} onClick={() => setTab('details')} controls="nft-tab-details">
            Detalhes do NFT
          </DescriptionTab>
          <DescriptionTab active={tab === 'reviews'} onClick={() => setTab('reviews')} controls="nft-tab-reviews">
            Avaliações de colecionadores ({nft.rating.count})
          </DescriptionTab>
        </div>
        <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
      </div>

      {tab === 'details' ? (
        <div id="nft-tab-details" role="tabpanel" className="flex flex-col gap-3 text-sm leading-6">
          <div className="flex flex-col gap-6 text-muted-foreground">
            {nft.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <DescriptionItem label="Rede:" value={nft.networkInfo} />
          <DescriptionItem label="Contrato:" value={nft.contractInfo} />
          <DescriptionItem label="Direitos autorais:" value={nft.royaltiesInfo} />
        </div>
      ) : (
        <div id="nft-tab-reviews" role="tabpanel" className="flex flex-col gap-3 text-sm leading-6">
          <Rating nft={nft} />
          <p className="text-muted-foreground">
            Nota média {nft.rating.average} de 5, com base em {nft.rating.count} avaliações de colecionadores
            verificados.
          </p>
        </div>
      )}
    </section>
  )
}

function DescriptionTab({
  active,
  onClick,
  controls,
  children,
}: {
  active: boolean
  onClick: () => void
  controls: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn('flex flex-col gap-3 text-[17px] leading-4', active ? 'font-bold text-highlight' : 'text-foreground')}
    >
      {children}
      <span className="relative h-0 w-full">
        {active && <img src={tabUnderlineWide} alt="" className="absolute inset-x-0 -top-[3px] h-[3px] w-full max-w-none" />}
      </span>
    </button>
  )
}

function DescriptionItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold">{label}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  )
}

interface MobileDetailsProps {
  nft: NftDetails
  editionId: EditionId
  onEditionChange: (id: EditionId) => void
  quantity: number
  maxQuantity: number
  onQuantityChange: (value: number) => void
  soldOut: boolean
  pending: boolean
  isFavorite: boolean
  onFavorite: () => void
  onBuy: () => void
  onAddToCart: () => void
  notice: { tone: 'error' | 'success'; text: string } | null
}

function MobileDetails(props: MobileDetailsProps) {
  const { nft } = props
  const router = useRouter()

  return (
    <div className="md:hidden">
      <div className="relative h-[506px] bg-[linear-gradient(137.64deg,#241612_0%,#2F1D15_100%)]">
        <div className="absolute inset-x-0 top-[23px] flex items-center justify-between px-7">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: '/' }))}
            className="grid size-[35px] place-items-center rounded-[17.5px] border border-border bg-surface-raised"
          >
            <img src={arrowLeft} alt="" className="h-[7.33px] w-[13.17px] rotate-90" />
          </button>
          <button
            type="button"
            aria-label={props.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
            aria-pressed={props.isFavorite}
            onClick={props.onFavorite}
            className={cn(
              'grid size-[35px] place-items-center rounded-[17.5px] border border-border bg-surface-raised',
              props.isFavorite && 'border-primary',
            )}
          >
            <img src={heartOutline} alt="" className="h-[14.23px] w-4" />
          </button>
        </div>
        <img
          src={nft.imageUrl}
          alt={nft.name}
          className="absolute top-[66px] left-1/2 h-[356px] w-[calc(100%-53px)] max-w-[361px] -translate-x-1/2 rounded-[24px] object-cover"
        />
        <img src={galleryDots} alt="" className="absolute top-[365px] left-1/2 h-[7px] w-14 -translate-x-1/2" />
      </div>

      <div className="relative -mt-[114px] flex flex-col gap-3 rounded-t-[31px] bg-surface-card px-6 pt-8 pb-12">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl leading-6 font-bold">{nft.name}</h1>
          <p className="flex h-[27px] shrink-0 items-center gap-1 rounded-[32px] border border-primary px-2 text-sm leading-4">
            <img src={starAmber} alt="" className="size-3.5" />
            <span className="font-medium">{nft.rating.average}</span>
            <span className="text-muted-foreground">({nft.rating.count})</span>
            <span className="sr-only"> avaliações</span>
          </p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{nft.summary}</p>
        <h2 className="text-[15px] leading-4 font-bold">Edição:</h2>
        <EditionPicker editions={nft.editions} value={props.editionId} onChange={props.onEditionChange} className="gap-3" />
        <TokenInfo nft={nft} />
        <div className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
          {nft.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-[40px] bg-surface-card px-6 pt-5 pb-9 drop-shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[15px] leading-4 font-medium text-muted-foreground">Qtd.</span>
            <QuantityStepper
              value={props.quantity}
              max={props.maxQuantity}
              onChange={props.onQuantityChange}
              itemLabel={nft.name}
              disabled={props.soldOut}
              valueClassName="text-lg leading-6 font-medium"
            />
          </div>
          <p className="text-xl leading-6 font-bold text-highlight">{formatEth(nft.priceEth)}</p>
        </div>
        {props.notice && <FormMessage tone={props.notice.tone}>{props.notice.text}</FormMessage>}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={props.soldOut || props.pending}
            aria-busy={props.pending}
            onClick={props.onBuy}
            className="h-[60px] flex-1 rounded-[40px] bg-[linear-gradient(100.37deg,var(--primary)_0%,rgb(210_138_76/0.8)_100%)] text-base leading-4 font-bold text-ink disabled:opacity-60"
          >
            {props.soldOut ? 'Esgotado' : 'Comprar NFT'}
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            disabled={props.soldOut || props.pending}
            onClick={props.onAddToCart}
            className="grid size-[60px] shrink-0 place-items-center rounded-full border border-border bg-surface-raised disabled:opacity-60"
          >
            <img src={shopIcon} alt="" className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="flex flex-col gap-8 max-md:p-6 lg:flex-row">
      <div className="flex gap-7">
        <div className="hidden flex-col gap-4 md:flex">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-[100px]" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full max-w-[444px] md:size-[444px]" />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  )
}
