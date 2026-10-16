import { cn } from '@/lib/utils'
import type { OrderStatus } from '../types'

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pagamento pendente',
  confirmed: 'Confirmado',
  failed: 'Pagamento recusado',
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-[32px] border px-2.5 text-xs leading-4 font-medium whitespace-nowrap',
        status === 'confirmed' && 'border-primary text-highlight',
        status === 'pending' && 'border-border-soft text-muted-foreground',
        status === 'failed' && 'border-coral text-coral',
        className,
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
