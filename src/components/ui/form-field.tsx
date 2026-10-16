import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import eyeHiddenFilled from '@/assets/icons/eye-hidden-filled.svg'
import selectArrowLg from '@/assets/icons/select-arrow-lg.svg'
import selectArrowLightLg from '@/assets/icons/select-arrow-light-lg.svg'
import selectArrowLight from '@/assets/icons/select-arrow-light.svg'
import selectArrow from '@/assets/icons/select-arrow.svg'
import { cn } from '@/lib/utils'
import { IconFrame } from './icon-frame'

/** 40px bordered control shared by the profile, wallet and checkout forms. */
export const inputClass =
  'h-10 w-full min-w-0 rounded-[3px] border border-border bg-transparent px-[13px] text-sm leading-[15px] text-foreground outline-none placeholder:text-subtle focus:border-primary aria-invalid:border-coral disabled:opacity-60'

interface FieldProps {
  label?: string
  required?: boolean
  /**
   * `relaxed`: profile labels keep the asterisk's 29px line box. `flush`: checkout labels keep
   * that box but sit directly on the control. `compact`: wallet labels.
   */
  spacing?: 'compact' | 'relaxed' | 'flush'
  error?: string
  className?: string
  children: (control: { id: string; invalid: boolean; describedBy: string | undefined }) => ReactNode
}

/** Label (with the coral asterisk from the design), control and inline error. */
export function Field({ label, required, spacing = 'compact', error, className, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={cn('flex min-w-0 flex-col', spacing === 'flush' ? 'gap-0' : 'gap-2.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn('flex items-center text-[15px] leading-[15px]', spacing !== 'compact' && 'min-h-[29px]')}
        >
          {label}
          {required && (
            <span aria-hidden className="text-[22px] leading-[15px] text-coral">
              *
            </span>
          )}
        </label>
      )}
      {children({ id, invalid: Boolean(error), describedBy: error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="text-xs leading-4 text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function SelectInput({
  className,
  children,
  arrow = 'default',
  arrowSize = 'lg',
  selectClassName,
  ...props
}: ComponentProps<'select'> & { arrow?: 'default' | 'light'; arrowSize?: 'lg' | 'md'; selectClassName?: string }) {
  const arrowSrc =
    arrowSize === 'lg'
      ? arrow === 'light'
        ? selectArrowLightLg
        : selectArrowLg
      : arrow === 'light'
        ? selectArrowLight
        : selectArrow
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          inputClass,
          'appearance-none pr-9 invalid:text-subtle [&>option]:bg-surface-card [&>option]:text-foreground',
          selectClassName,
        )}
        {...props}
      >
        {children}
      </select>
      <img
        src={arrowSrc}
        alt=""
        className={cn(
          'pointer-events-none absolute top-1/2 right-2 -translate-y-1/2',
          arrowSize === 'lg' ? 'size-5' : 'size-[18px]',
        )}
      />
    </div>
  )
}

/** ENS name: ".eth" suffix picker beside the name field, as in the profile and wallet frames. */
export function EnsInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  arrowSize,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid: boolean
  describedBy?: string
  arrowSize?: 'lg' | 'md'
}) {
  return (
    <div className="flex gap-2.5">
      <SelectInput
        aria-label="Sufixo ENS"
        arrow="light"
        arrowSize={arrowSize}
        className="w-[78px] shrink-0"
        selectClassName="pr-7 pl-2.5"
        defaultValue=".eth"
      >
        <option value=".eth">.eth</option>
      </SelectInput>
      <TextInput
        id={id}
        value={value}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={cn('relative', className)}>
      <input type={visible ? 'text' : 'password'} className={cn(inputClass, 'pr-12')} {...props} />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-4 size-5 -translate-y-1/2"
      >
        <IconFrame src={eyeHiddenFilled} className="size-5" inner="inset-[16.67%_8.33%_11.36%_8.33%]" />
      </button>
    </div>
  )
}

export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('text-sm leading-5', tone === 'error' ? 'text-coral' : 'text-highlight')}
    >
      {children}
    </p>
  )
}
