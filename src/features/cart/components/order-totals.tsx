import dividerPrimary from '@/assets/ui/divider-primary.svg'
import { formatDiscount, formatEth } from '@/lib/format'
import type { DecimalString } from '@/lib/money'
import { cn } from '@/lib/utils'

interface OrderTotalsProps {
  subtotalEth: DecimalString
  discountEth: DecimalString
  networkFeeEth: DecimalString
  totalEth: DecimalString
  /**
   * `cart`: desktop cart summary. `checkout`: centered fee note and a rule before the total.
   * `mobile`: mobile payment sheet with 16px values.
   */
  variant: 'cart' | 'checkout' | 'mobile'
  className?: string
}

export function OrderTotals({ subtotalEth, discountEth, networkFeeEth, totalEth, variant, className }: OrderTotalsProps) {
  const valueClass = variant === 'mobile' ? 'text-base leading-4' : 'text-lg leading-4'

  return (
    <div className={cn('flex w-full flex-col gap-3 whitespace-nowrap', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[15px] leading-5">Subtotal</span>
        <span className={valueClass}>{formatEth(subtotalEth)}</span>
      </div>
      <div className="flex items-center justify-between text-[15px] leading-5">
        <span>Desconto do lançamento</span>
        <span>{formatDiscount(discountEth)}</span>
      </div>
      <div className={cn('flex flex-col', variant === 'checkout' ? 'items-center gap-3' : 'items-end')}>
        <div className="flex w-full items-center justify-between">
          <span className="text-[15px] leading-5">Taxa de rede</span>
          <span className={valueClass}>{formatEth(networkFeeEth)}</span>
        </div>
        <p className={cn('text-xs leading-4 text-highlight', variant === 'cart' && 'mt-3')}>Taxa estimada</p>
      </div>
      {variant === 'checkout' && <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />}
      <div
        className={cn(
          'flex items-center justify-between leading-4 font-bold',
          variant === 'checkout' && 'mx-auto w-full max-w-[321px]',
        )}
      >
        <span className="text-base">Total</span>
        <span className="text-lg text-highlight">{formatEth(totalEth)}</span>
      </div>
    </div>
  )
}
