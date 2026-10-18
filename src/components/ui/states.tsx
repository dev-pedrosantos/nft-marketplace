import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton-shimmer rounded-[6px]', className)} />
}

export function LoadingState({ label, className }: { label: string; className?: string }) {
  return (
    <p role="status" className={cn('py-20 text-center text-sm text-muted-foreground', className)}>
      {label}
    </p>
  )
}

export function ErrorState({
  message,
  onRetry,
  retrying,
  className,
}: {
  message: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 py-20 text-center text-sm', className)}>
      <p className="text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="font-bold text-highlight disabled:opacity-60"
        >
          {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div role="status" className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
      <p className="text-base font-bold">{title}</p>
      {description && <p className="max-w-md text-sm leading-[22px] text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
