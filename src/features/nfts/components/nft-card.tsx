import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import favoriteIcon from '@/assets/icons/favorite.svg'
import { useSession } from '@/features/auth/session-store'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/api'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Nft } from '../types'

interface NftCardProps {
  nft: Nft
  className?: string
}

/**
 * Desktop: 258×300 surface box with a 250px artwork.
 * Mobile: 175×200 gradient box with a 168px artwork, favorite button and "RARO" tag.
 */
export function NftCard({ nft, className }: NftCardProps) {
  return (
    <article className={cn('relative flex flex-col gap-2 md:gap-3', className)}>
      <div
        className={cn(
          'relative flex h-[200px] items-center justify-center overflow-hidden rounded-[20px] px-1',
          'bg-[linear-gradient(139.55deg,var(--surface-card)_12%,var(--surface-raised)_106.59%)]',
          'md:aspect-[258/300] md:h-auto md:items-start md:rounded-none md:bg-none md:bg-surface-card md:pt-[9.3%]',
        )}
      >
        <img
          src={nft.imageUrl}
          alt={nft.name}
          loading="lazy"
          className="aspect-square h-[168px] rounded-[16px] object-cover md:h-auto md:w-full md:rounded-[15px]"
        />

        {nft.isRare && (
          <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center bg-primary pl-2 text-[13px] font-medium text-primary-foreground md:hidden">
            RARO
          </span>
        )}

        <FavoriteButton nft={nft} />
      </div>

      <div className="flex flex-col pl-2 md:gap-1.5 md:pl-0">
        <h3 className="truncate text-[15px] leading-5 md:text-base md:leading-4">
          {/* The pseudo-element stretches the link over the whole card. */}
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex items-center gap-3 text-base leading-4 md:text-lg">
          <span className="font-bold text-highlight">{formatEth(nft.priceEth)}</span>
          {nft.previousPriceEth !== undefined && (
            <span className="text-subtle">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPriceEth)}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}

function FavoriteButton({ nft }: { nft: Nft }) {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const isFavorite = useIsFavorite(nft.id)
  const toggle = useToggleFavorite()

  const onClick = () => {
    if (!session) {
      void navigate({
        to: '.',
        search: (previous) => ({ ...previous, auth: 'login' as const, redirect: location.href }),
        resetScroll: false,
      })
      return
    }
    // One toggle at a time: responses can arrive out of order and leave the server inverted.
    if (toggle.isPending) return
    toggle.mutate({ nft, favorite: !isFavorite })
  }

  return (
    <button
      type="button"
      aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      aria-pressed={isFavorite}
      onClick={onClick}
      className="absolute top-3 right-[11px] z-10 size-7 md:hidden"
    >
      <img src={favoriteIcon} alt="" className="block size-full" />
    </button>
  )
}
