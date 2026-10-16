import { cn } from '@/lib/utils'
import type { Nft } from '../types'
import { NftCard } from './nft-card'

interface NftGridProps {
  nfts: Nft[]
  className?: string
}

export function NftGrid({ nfts, className }: NftGridProps) {
  return (
    <ul
      className={cn(
        // Mobile: two columns with the right one shifted 32px down, as in the design.
        'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:pb-0',
        'md:grid-cols-3 md:gap-x-[clamp(16px,4%,34px)] md:gap-y-[72px] lg:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {nfts.map((nft) => (
        <li key={nft.id} className="max-md:even:translate-y-8">
          <NftCard nft={nft} />
        </li>
      ))}
    </ul>
  )
}
