import { useId } from 'react'
import filterIcon from '@/assets/icons/filter.svg'
import searchMuted from '@/assets/icons/search-muted.svg'
import { cn } from '@/lib/utils'

interface MobileSearchBarProps {
  value: string
  onChange: (value: string) => void
  onOpenFilters: () => void
  filtersOpen: boolean
  className?: string
}

export function MobileSearchBar({
  value,
  onChange,
  onOpenFilters,
  filtersOpen,
  className,
}: MobileSearchBarProps) {
  const inputId = useId()

  return (
    <div role="search" className={cn('flex h-[45px] gap-2', className)}>
      <label
        htmlFor={inputId}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-surface-card px-3"
      >
        <img src={searchMuted} alt="" className="size-[22px] shrink-0" />
        <span className="sr-only">Buscar NFTs</span>
        <input
          id={inputId}
          type="search"
          placeholder="Explorar coleções"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-subtle"
        />
      </label>
      <button
        type="button"
        aria-label="Filtros"
        aria-haspopup="dialog"
        aria-expanded={filtersOpen}
        onClick={onOpenFilters}
        className="relative size-[45px] shrink-0 rounded-[14px] bg-[linear-gradient(137.05deg,rgba(210,138,76,0.45)_24.6%,#d28a4c_100%)]"
      >
        <img
          src={filterIcon}
          alt=""
          className="absolute top-1/2 left-1/2 size-[16.1px] max-w-none -translate-1/2"
        />
      </button>
    </div>
  )
}
