import type { ReactNode } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ComingSoonProps {
  /** Name of the unavailable area, shown in the dialog. */
  feature: string
  className?: string
  children: ReactNode
}

/** Header and footer items without a page yet: a button that opens the "Em breve" dialog on click. */
export function ComingSoon({ feature, className, children }: ComingSoonProps) {
  return (
    <Dialog>
      <DialogTrigger className={cn('cursor-pointer text-left', className)}>{children}</DialogTrigger>
      <DialogContent
        className="flex max-w-[400px] flex-col items-center gap-4 overflow-hidden rounded-[8px] border border-border-soft px-8 pt-12 pb-[50px] text-center shadow-2xl shadow-ink/60 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 md:px-12"
        overlayClassName="backdrop-blur-[2px] duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        closeClassName="top-4 right-4"
      >
        <p aria-hidden className="text-sm leading-none font-bold tracking-[1.4px] text-highlight">
          KURIO
        </p>
        <DialogTitle className="text-[28px] leading-9 font-bold text-heading">Em breve</DialogTitle>
        <DialogDescription className="text-sm leading-[22px] text-muted-foreground">
          {feature} ainda não está disponível no marketplace.
        </DialogDescription>
        <DialogClose className="mt-4 h-10 rounded-[6px] bg-primary px-8 text-base font-bold text-primary-foreground transition-colors hover:bg-highlight">
          Entendi
        </DialogClose>
        <span aria-hidden className="absolute bottom-0 left-0 h-2.5 w-full bg-primary" />
      </DialogContent>
    </Dialog>
  )
}
