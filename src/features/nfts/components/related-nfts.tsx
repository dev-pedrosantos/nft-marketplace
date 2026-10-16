import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import carouselDots from '@/assets/ui/carousel-dots.svg'
import dividerPrimary from '@/assets/ui/divider-primary.svg'
import { Skeleton } from '@/components/ui/states'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { nftQueries } from '../api'
import type { Nft } from '../types'

interface RelatedNftsProps {
  nftId: string
  title: string
  /** The detail and cart frames draw the cards with slightly different spacing. */
  variant?: 'detail' | 'cart'
  className?: string
}

export function RelatedNfts({ nftId, title, variant = 'detail', className }: RelatedNftsProps) {
  const query = useQuery(nftQueries.related(nftId))
  const titleId = `related-${nftId}`

  if (query.isError || (query.data && query.data.length === 0)) return null

  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col gap-8', className)}>
      <header className="flex flex-col gap-3">
        <h2 id={titleId} className="text-[17px] leading-4 font-bold text-highlight">
          {title}
        </h2>
        <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
      </header>

      <div className="flex flex-col items-center gap-8">
        <ul className="flex w-full snap-x gap-4 overflow-x-auto pb-2 xl:justify-between xl:gap-2 xl:overflow-visible xl:pb-0">
          {query.isPending
            ? Array.from({ length: 5 }, (_, index) => (
                <li key={index} className="flex w-[220px] shrink-0 flex-col gap-3">
                  <Skeleton className="h-[255px] rounded-none" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20" />
                </li>
              ))
            : query.data.map((nft, index) => (
                <RelatedCard key={nft.id} nft={nft} first={index === 0} variant={variant} />
              ))}
        </ul>
        <img src={carouselDots} alt="" className="hidden h-3 w-[52px] xl:block" />
      </div>
    </section>
  )
}

/** The first card of each design row uses a taller, narrower artwork. */
function RelatedCard({ nft, first, variant }: { nft: Nft; first: boolean; variant: 'detail' | 'cart' }) {
  const cart = variant === 'cart'
  return (
    <li className="w-[220px] shrink-0 snap-start">
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className={cn('group flex flex-col', cart ? 'gap-2' : 'gap-3')}
      >
        <span
          className={cn(
            'flex h-[255px] bg-surface-card',
            cart
              ? 'items-center justify-center'
              : first
                ? 'items-start pt-1 pr-3 pb-2 pl-5'
                : 'items-start px-1 pt-5 pb-6',
          )}
        >
          <img
            src={nft.imageUrl}
            alt=""
            loading="lazy"
            className={cn(
              'object-cover transition-transform group-hover:scale-[1.02]',
              first ? 'h-[243px] w-[190px]' : 'size-[212px]',
              cart ? (first ? 'rounded-[15px]' : 'rounded-[17px]') : first ? 'rounded-[11px]' : 'rounded-[13px]',
            )}
          />
        </span>
        <span className="flex flex-col">
          <span className="truncate text-[15px] leading-[normal]">{nft.name}</span>
          <span className="text-base leading-4 font-bold text-highlight">{formatEth(nft.priceEth)}</span>
        </span>
      </Link>
    </li>
  )
}
