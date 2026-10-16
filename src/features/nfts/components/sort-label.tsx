import chevronDown from '@/assets/icons/chevron-down.svg'
import { cn } from '@/lib/utils'

interface SortLabelProps {
  label: string
  className?: string
}

/** Only the current option is defined in the design; there is no dropdown yet. */
export function SortLabel({ label, className }: SortLabelProps) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      className={cn('flex items-center gap-2 text-[15px] leading-[18px] whitespace-nowrap', className)}
    >
      <span className="hidden xl:inline">Ordenar por:</span>
      <span>{label}</span>
      <span className="relative size-4">
        <img
          src={chevronDown}
          alt=""
          className="absolute top-1/2 left-1/2 h-[6.17px] w-[10.83px] max-w-none -translate-1/2"
        />
      </span>
    </button>
  )
}
