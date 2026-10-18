import type { ReactNode } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SORT_OPTIONS } from '../sort-options'
import type { NftSort } from '../types'
import { FilterGroup, OptionList } from './catalog-filters'

interface CatalogFiltersDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sort: NftSort
  onSortChange: (sort: NftSort) => void
  children: ReactNode
}

/**
 * The Figma only draws the filters sidebar and the sort control at desktop width;
 * below `lg` both open here, as a bottom sheet on phones and a side panel on tablets.
 * Choices apply immediately, so closing never discards anything.
 */
export function CatalogFiltersDrawer({
  open,
  onOpenChange,
  sort,
  onSortChange,
  children,
}: CatalogFiltersDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel="Fechar filtros"
        closeClassName="top-6 right-6"
        className="top-auto bottom-0 left-0 flex max-h-[88dvh] w-full translate-none flex-col gap-6 rounded-t-[20px] px-6 pt-6 pb-8 md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[380px] md:rounded-none md:px-8"
      >
        <header className="flex flex-col gap-1 pr-8">
          <DialogTitle className="text-xl leading-6 font-bold">Filtros</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            O catálogo é atualizado a cada escolha.
          </DialogDescription>
        </header>

        <FilterGroup title="Ordenar por">
          <OptionList
            options={SORT_OPTIONS.map((option) => ({ id: option.value, label: option.label }))}
            selected={sort}
            onSelect={(value) => onSortChange(value as NftSort)}
            className="pl-3"
          />
        </FilterGroup>

        {children}

        <DialogClose className="mt-auto h-12 shrink-0 rounded-[6px] bg-primary text-base font-bold text-ink">
          Ver resultados
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
