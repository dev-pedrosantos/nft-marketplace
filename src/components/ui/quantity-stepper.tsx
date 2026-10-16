import minusLg from '@/assets/icons/minus-lg.svg'
import minus from '@/assets/icons/minus.svg'
import plusLg from '@/assets/icons/plus-lg.svg'
import plus from '@/assets/icons/plus.svg'
import qtyMinusDisabled from '@/assets/ui/qty-minus-disabled.svg'
import qtyMinus from '@/assets/ui/qty-minus.svg'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Accessible name of the item, e.g. "Emerald Ape #042". */
  itemLabel: string
  disabled?: boolean
  /**
   * `lg`: 33×49.5 pills (desktop detail). `sm`: 20×30 pills (desktop cart, mobile buy bar).
   * `round`: 24px circles (mobile cart).
   */
  size?: 'lg' | 'sm' | 'round'
  valueClassName?: string
  className?: string
}

const pillClass =
  'flex items-center justify-center rounded-[33px] border border-ink bg-primary drop-shadow-[0_6.6px_9.9px_rgba(20,13,10,0.15)] disabled:opacity-40'

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  itemLabel,
  disabled,
  size = 'sm',
  valueClassName,
  className,
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > min
  const canIncrease = !disabled && value < max

  const decrease = (
    <button
      type="button"
      aria-label={`Diminuir quantidade de ${itemLabel}`}
      disabled={!canDecrease}
      onClick={() => onChange(value - 1)}
      className={cn(
        size === 'lg' && cn(pillClass, 'h-[49.5px] w-[33px]'),
        size === 'sm' && cn(pillClass, 'h-[30px] w-5'),
        size === 'round' && 'relative size-6',
      )}
    >
      {size === 'round' ? (
        <img src={canDecrease ? qtyMinus : qtyMinusDisabled} alt="" className="absolute inset-0 size-full" />
      ) : (
        <img src={size === 'lg' ? minusLg : minus} alt="" className={size === 'lg' ? 'size-[26.4px]' : 'size-4'} />
      )}
    </button>
  )

  const increase = (
    <button
      type="button"
      aria-label={`Aumentar quantidade de ${itemLabel}`}
      disabled={!canIncrease}
      onClick={() => onChange(value + 1)}
      className={cn(
        size === 'lg' && cn(pillClass, 'h-[49.5px] w-[33px]'),
        size === 'sm' && cn(pillClass, 'h-[30px] w-5'),
        size === 'round' &&
          'flex size-6 items-center justify-center rounded-full border border-border bg-surface-raised text-[21px] leading-none disabled:opacity-40',
      )}
    >
      {size === 'round' ? (
        <span aria-hidden className="-mt-0.5">
          +
        </span>
      ) : (
        <img src={size === 'lg' ? plusLg : plus} alt="" className={size === 'lg' ? 'size-[26.4px]' : 'size-4'} />
      )}
    </button>
  )

  return (
    <div role="group" aria-label={`Quantidade de ${itemLabel}`} className={cn('flex items-center gap-3', className)}>
      {decrease}
      <output
        aria-live="polite"
        className={cn(
          'min-w-[1ch] text-center',
          size === 'lg' && 'text-xl leading-7',
          size === 'sm' && 'text-[17px] leading-6',
          size === 'round' && 'text-base leading-[22px]',
          valueClassName,
        )}
      >
        {value}
      </output>
      {increase}
    </div>
  )
}
