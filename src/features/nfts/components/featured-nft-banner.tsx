import { cn } from '@/lib/utils'
import type { FeaturedNft } from '../types'

const orbGradient =
  'bg-[linear-gradient(145.46deg,rgba(210,138,76,0.3)_46.085%,rgba(210,138,76,0)_103.28%)]'

export function FeaturedNftBanner({
  nft,
  className,
}: {
  nft: FeaturedNft
  className?: string
}) {
  return (
    <section
      aria-label={nft.headline}
      className={cn(
        'relative flex h-[470px] flex-col gap-4 overflow-hidden bg-linear-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1',
        className,
      )}
    >
      <div className="flex flex-col gap-4 px-5">
        <p className="text-2xl leading-8 font-bold text-highlight">{nft.headline}</p>
        <p className="text-center text-[22px] leading-4 font-bold">{nft.tagline}</p>
      </div>
      <img
        src={nft.imageUrl}
        alt=""
        loading="lazy"
        className="h-[368px] w-full rounded-[22px] object-cover"
      />
      <span className="absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20" />
      <span className={cn('absolute top-[343px] left-[248px] size-[45px] rounded-[29px]', orbGradient)} />
      <span className={cn('absolute top-[105px] left-[38px] size-[15px] rounded-[29px]', orbGradient)} />
    </section>
  )
}
