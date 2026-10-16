import tabUnderline from '@/assets/home/tab-underline.svg'
import { cn } from '@/lib/utils'
import { NFT_TABS, type NftTab } from '../types'

const TAB_LABELS: Record<NftTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

interface NftTabsProps {
  value: NftTab
  onChange: (tab: NftTab) => void
  className?: string
}

export function NftTabs({ value, onChange, className }: NftTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar NFTs"
      className={cn('flex items-start gap-4 overflow-x-auto md:gap-5', className)}
    >
      {NFT_TABS.map((tab) => {
        const selected = tab === value
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={cn(
              'flex shrink-0 flex-col gap-1 text-sm leading-4 whitespace-nowrap md:gap-[5px] md:text-[15px] md:font-medium',
              selected ? 'font-bold text-highlight' : 'text-foreground',
            )}
          >
            {TAB_LABELS[tab]}
            <img
              src={tabUnderline}
              alt=""
              className={cn('h-0.5 w-0 max-w-none min-w-full', !selected && 'invisible')}
            />
          </button>
        )
      })}
    </div>
  )
}
