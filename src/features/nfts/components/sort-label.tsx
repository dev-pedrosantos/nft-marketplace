import { useId } from 'react'
import chevronDown from '@/assets/icons/chevron-down.svg'
import { cn } from '@/lib/utils'
import { SORT_OPTIONS } from '../sort-options'
import type { NftSort } from '../types'

interface SortLabelProps {
  value: NftSort
  onChange: (value: NftSort) => void
  className?: string
}

/**
 * The design only draws the current option; a transparent native select sits on top
 * so the control keeps that look while staying keyboard and screen-reader friendly.
 */
export function SortLabel({ value, onChange, className }: SortLabelProps) {
  const id = useId()
  const label = SORT_OPTIONS.find((option) => option.value === value)?.label ?? SORT_OPTIONS[0].label

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 text-[15px] leading-[18px] whitespace-nowrap has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-ring',
        className,
      )}
    >
      <label htmlFor={id} className="hidden xl:inline">
        Ordenar por:
      </label>
      <span aria-hidden>{label}</span>
      <span className="relative size-4">
        <img
          src={chevronDown}
          alt=""
          className="absolute top-1/2 left-1/2 h-[6.17px] w-[10.83px] max-w-none -translate-1/2"
        />
      </span>
      <select
        id={id}
        aria-label="Ordenar por"
        value={value}
        onChange={(event) => onChange(event.target.value as NftSort)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 [&>option]:bg-surface-card [&>option]:text-foreground"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
