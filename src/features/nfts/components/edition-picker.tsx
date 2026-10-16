import editionRingActive from '@/assets/ui/edition-ring-active.svg'
import editionRingLg from '@/assets/ui/edition-ring-lg.svg'
import editionRingMd from '@/assets/ui/edition-ring-md.svg'
import editionRing from '@/assets/ui/edition-ring.svg'
import { cn } from '@/lib/utils'
import type { EditionId, NftEdition } from '../types'

/** Pill widths and outlines from the design, per edition. */
const PILL: Record<EditionId, { width: string; ring: string; padding: string }> = {
  '1-1': { width: 'w-9', ring: editionRing, padding: 'px-1' },
  '1-10': { width: 'w-[42px]', ring: editionRingMd, padding: 'px-1' },
  '1-50': { width: 'w-[46px]', ring: editionRingMd, padding: 'px-1.5' },
  open: { width: 'w-[66px]', ring: editionRingLg, padding: 'px-2' },
}

interface EditionPickerProps {
  editions: NftEdition[]
  value: EditionId
  onChange: (id: EditionId) => void
  className?: string
}

export function EditionPicker({ editions, value, onChange, className }: EditionPickerProps) {
  return (
    <div role="radiogroup" aria-label="Edição" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {editions.map((edition) => {
        const selected = edition.id === value
        const soldOut = edition.available === 0
        const pill = PILL[edition.id]
        return (
          <button
            key={edition.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={soldOut}
            title={soldOut ? 'Esgotada' : `${edition.available} disponíveis`}
            onClick={() => onChange(edition.id)}
            className={cn(
              'relative flex h-7 items-center justify-center text-sm leading-4 disabled:cursor-not-allowed disabled:opacity-40',
              pill.width,
              pill.padding,
              selected ? 'font-medium text-highlight' : 'text-muted-foreground',
            )}
          >
            <img
              src={selected ? editionRingActive : pill.ring}
              alt=""
              className="absolute inset-0 size-full max-w-none"
            />
            <span className={cn('relative', soldOut && 'line-through')}>{edition.label}</span>
            {soldOut && <span className="sr-only"> (esgotada)</span>}
          </button>
        )
      })}
    </div>
  )
}
