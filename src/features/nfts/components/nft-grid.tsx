import { Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/utils'
import type { Nft } from '../types'
import { NftCard } from './nft-card'

interface NftGridProps {
  nfts: Nft[]
  className?: string
}

const gridClass = cn(
  // Mobile: two columns with the right one shifted 32px down, as in the design.
  'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:pb-0',
  'md:grid-cols-3 md:gap-x-[clamp(16px,4%,34px)] md:gap-y-[72px] lg:grid-cols-2 xl:grid-cols-3',
)

const cellClass = 'max-md:even:translate-y-8'

export function NftGrid({ nfts, className }: NftGridProps) {
  return (
    <ul className={cn(gridClass, className)}>
      {nfts.map((nft) => (
        <li key={nft.id} className={cellClass}>
          <NftCard nft={nft} />
        </li>
      ))}
    </ul>
  )
}

/** Same grid and card boxes as `NftGrid`, so the page does not shift when the results arrive. */
export function NftGridSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div role="status" aria-label="Carregando NFTs" className={cn(gridClass, className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn('flex flex-col gap-2 md:gap-3', cellClass)}>
          <Skeleton className="h-[200px] rounded-[20px] md:aspect-[258/300] md:h-auto md:rounded-none" />
          <div className="flex flex-col gap-0.5 pl-2 md:gap-1.5 md:pl-0">
            <Skeleton className="h-[18px] w-3/4 md:h-4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
