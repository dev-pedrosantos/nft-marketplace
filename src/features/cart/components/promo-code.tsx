import { useId, useState, type FormEvent } from 'react'
import { errorMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import { useApplyCoupon, useRemoveCoupon } from '../api'
import type { AppliedCoupon } from '../types'

interface PromoCodeProps {
  coupon: AppliedCoupon | null
  networkId?: string
  /** `desktop`: 40px squared field. `mobile`: 50px pill with the gradient button. */
  variant: 'desktop' | 'mobile'
  showLabel?: boolean
  className?: string
}

export function PromoCode({ coupon, networkId, variant, showLabel = false, className }: PromoCodeProps) {
  const id = useId()
  const [code, setCode] = useState('')
  const apply = useApplyCoupon(networkId)
  const remove = useRemoveCoupon(networkId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    apply.mutate(trimmed, { onSuccess: () => setCode('') })
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn('text-sm leading-4 font-bold', !showLabel && 'sr-only')}>
        Código promocional
      </label>

      {coupon ? (
        <div
          className={cn(
            'flex items-center justify-between gap-3 border border-primary px-3 text-sm',
            variant === 'desktop' ? 'h-10 rounded-[3px]' : 'h-[50px] rounded-[40px] px-4',
          )}
        >
          <span>
            <span className="font-bold text-highlight">{coupon.code}</span>
            <span className="text-muted-foreground"> • {coupon.label}</span>
          </span>
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="font-medium text-highlight disabled:opacity-60"
          >
            Remover
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className={cn(
            'flex items-center overflow-hidden',
            variant === 'desktop'
              ? 'h-10 rounded-[3px] border border-primary pl-2'
              : 'h-[50px] rounded-[40px] border border-border drop-shadow-[0_6px_20px_rgba(10,6,4,0.45)]',
          )}
        >
          <input
            id={id}
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              if (apply.isError) apply.reset()
            }}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Digite o código promocional..."
            aria-invalid={apply.isError || undefined}
            aria-describedby={apply.isError ? `${id}-error` : undefined}
            className={cn(
              'h-full min-w-0 flex-1 bg-transparent leading-4 outline-none placeholder:text-subtle',
              variant === 'desktop' ? 'text-xs' : 'pl-4 text-[13px] leading-[22px]',
            )}
          />
          <button
            type="submit"
            disabled={apply.isPending || !code.trim()}
            aria-busy={apply.isPending}
            className={cn(
              'h-full shrink-0 text-[15px] leading-4 font-bold disabled:cursor-not-allowed',
              variant === 'desktop'
                ? 'w-[102px] rounded-r-[3px] bg-primary text-ink'
                : 'w-[97px] rounded-[40px] bg-[linear-gradient(96deg,rgb(210_138_76/0.54)_0%,var(--primary)_100%)] text-foreground',
            )}
          >
            {apply.isPending ? '…' : 'Aplicar'}
          </button>
        </form>
      )}

      {apply.isError && (
        <p id={`${id}-error`} role="alert" className="text-xs leading-4 text-coral">
          {errorMessage(apply.error, 'Não foi possível aplicar o cupom.')}
        </p>
      )}
      {remove.isError && (
        <p role="alert" className="text-xs leading-4 text-coral">
          {errorMessage(remove.error, 'Não foi possível remover o cupom.')}
        </p>
      )}
    </div>
  )
}
