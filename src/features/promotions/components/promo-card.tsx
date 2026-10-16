import arrowRightInk from '@/assets/icons/arrow-right-ink.svg'
import promoMask from '@/assets/home/promo-mask.svg'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Promotion } from '../types'

interface PromoCardProps {
  promotion: Promotion
  href: string
  className?: string
}

export function PromoCard({ promotion, href, className }: PromoCardProps) {
  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-[8px] bg-surface-card md:h-[250px] md:flex-row md:justify-end',
        className,
      )}
    >
      <img
        src={promotion.imageUrl}
        alt=""
        loading="lazy"
        className="h-[200px] w-full rounded-[18px] object-cover md:absolute md:top-0 md:-left-[5px] md:h-full md:w-1/2 md:max-w-[292px]"
      />

      <div className="relative flex flex-col items-start gap-0 p-5 md:w-[52%] md:items-end md:p-0 md:pt-[37px] md:pr-[30px] md:text-right">
        <h3 className="text-lg leading-6 font-bold whitespace-pre-line">{promotion.title}</h3>
        <p className="mt-[9px] max-w-[263px] text-sm leading-6 text-muted-foreground">
          {promotion.description}
        </p>
        <Button
          asChild
          className="mt-[22px] h-10 w-[140px] gap-1 rounded-[6px] text-sm leading-5 font-medium"
        >
          <a href={href}>
            {promotion.ctaLabel}
            <span className="relative size-[18px]">
              <img
                src={arrowRightInk}
                alt=""
                className="absolute top-1/2 left-1/2 h-[12.75px] w-[10.54px] max-w-none -translate-1/2 -rotate-90"
              />
            </span>
          </a>
        </Button>
      </div>

      <img
        src={promoMask}
        alt=""
        className="pointer-events-none absolute top-0 left-0 hidden h-[250px] w-[586px] max-w-none md:block"
      />
    </article>
  )
}
