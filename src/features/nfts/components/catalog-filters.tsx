import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatEthRange } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CatalogFilterOption, CatalogFilters as CatalogFiltersData, PriceRange } from '../types'
import { PriceRangeSlider } from './price-range-slider'

interface CatalogFiltersProps {
  filters: CatalogFiltersData
  collection?: string
  network?: string
  price: PriceRange
  onCollectionChange: (id: string) => void
  onNetworkChange: (id: string) => void
  onPriceApply: (range: PriceRange) => void
  className?: string
}

export function CatalogFilters({
  filters,
  collection,
  network,
  price,
  onCollectionChange,
  onNetworkChange,
  onPriceApply,
  className,
}: CatalogFiltersProps) {
  const [draftPrice, setDraftPrice] = useState(price)

  return (
    <div className={cn('flex flex-col gap-10 bg-surface-card p-5', className)}>
      <FilterGroup title="Coleções">
        <OptionList
          options={filters.collections}
          selected={collection}
          onSelect={onCollectionChange}
          boldCount
          className="px-3"
        />
      </FilterGroup>

      <FilterGroup title="Faixa de preço">
        <div className="flex flex-col gap-3 pl-3">
          <PriceRangeSlider bounds={filters.priceRange} value={draftPrice} onChange={setDraftPrice} />
          <p className="text-[15px] leading-[normal]">
            Preço: {formatEthRange(draftPrice.min, draftPrice.max)}
          </p>
          <Button
            type="button"
            onClick={() => onPriceApply(draftPrice)}
            className="h-auto self-start rounded-[6px] px-3 py-2 text-base leading-5 font-bold"
          >
            Aplicar
          </Button>
        </div>
      </FilterGroup>

      <FilterGroup title="Rede">
        <OptionList
          options={filters.networks}
          selected={network}
          onSelect={onNetworkChange}
          className="pl-3"
        />
      </FilterGroup>
    </div>
  )
}

interface FilterGroupProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function FilterGroup({ title, children, className }: FilterGroupProps) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-lg leading-4 font-bold">{title}</h2>
      {children}
    </section>
  )
}

interface OptionListProps {
  options: (Omit<CatalogFilterOption, 'count'> & { count?: number })[]
  selected?: string
  onSelect: (id: string) => void
  boldCount?: boolean
  className?: string
}

export function OptionList({ options, selected, onSelect, boldCount, className }: OptionListProps) {
  return (
    <ul className={cn('flex flex-col', className)}>
      {options.map((option) => {
        const active = option.id === selected
        return (
          <li key={option.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.id)}
              className={cn(
                'flex w-full items-start justify-between text-[15px] leading-10 transition-colors',
                active ? 'text-highlight' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className={cn('text-right', boldCount && 'font-bold')}>({option.count})</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
