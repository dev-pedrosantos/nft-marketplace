import chevronRight from '@/assets/icons/chevron-right.svg'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const isLast = page >= totalPages

  return (
    <nav aria-label="Paginação" className={cn('flex items-center gap-2', className)}>
      {pages.map((item) => {
        const current = item === page
        return (
          <button
            key={item}
            type="button"
            aria-current={current ? 'page' : undefined}
            aria-label={`Página ${item}`}
            onClick={() => onPageChange(item)}
            className={cn(
              'grid size-[35px] place-items-center rounded-[4px] text-lg leading-4',
              current
                ? 'bg-primary font-bold text-primary-foreground'
                : 'border border-border text-foreground hover:border-primary',
            )}
          >
            {item}
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Próxima página"
        disabled={isLast}
        onClick={() => onPageChange(page + 1)}
        className="relative size-[35px] rounded-[4px] border border-border hover:border-primary disabled:opacity-40"
      >
        <img
          src={chevronRight}
          alt=""
          className="absolute top-1/2 left-1/2 h-[6.75px] w-3 max-w-none -translate-1/2 -rotate-90"
        />
      </button>
    </nav>
  )
}
