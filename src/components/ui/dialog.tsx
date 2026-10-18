import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import closeIcon from '@/assets/icons/close.svg'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
export const DialogClose = DialogPrimitive.Close

interface DialogContentProps {
  children: ReactNode
  className?: string
  overlayClassName?: string
  /** Hidden from sighted users when the design has no visible title. */
  closeLabel?: string
  showClose?: boolean
  /** Some frames draw their own close glyph and position. */
  closeIconSrc?: string
  closeClassName?: string
  onOpenAutoFocus?: (event: Event) => void
}

/** Focus trap, Escape and scroll lock come from Radix. */
export function DialogContent({
  children,
  className,
  overlayClassName,
  closeLabel = 'Fechar',
  showClose = true,
  closeIconSrc = closeIcon,
  closeClassName,
  onOpenAutoFocus,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-ink/80 data-[state=open]:animate-in data-[state=open]:fade-in-0',
          overlayClassName,
        )}
      />
      <DialogPrimitive.Content
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-1/2 overflow-y-auto bg-surface-card outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className={cn('absolute top-[11px] right-3 size-[18px]', closeClassName)}
          >
            <img src={closeIconSrc} alt="" className="absolute inset-0 size-full" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  pending?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  pending,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-[440px] flex-col gap-5 rounded-[8px] p-8">
        <DialogTitle className="pr-6 text-lg leading-6 font-bold">{title}</DialogTitle>
        {description && (
          <DialogDescription asChild>
            <div className="text-sm leading-[22px] text-muted-foreground">{description}</div>
          </DialogDescription>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose className="h-10 rounded-[3px] border border-border px-4 text-sm font-medium">
            {cancelLabel}
          </DialogClose>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="h-10 rounded-[3px] bg-primary px-4 text-sm font-bold text-ink disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
