import { useMutation } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { subscribeToNewsletter } from '../api'

export function NewsletterForm({ className }: { className?: string }) {
  const inputId = useId()
  const [email, setEmail] = useState('')
  const subscription = useMutation({
    mutationFn: subscribeToNewsletter,
    onSuccess: () => setEmail(''),
  })

  return (
    <form
      className={cn('flex flex-col gap-3', className)}
      onSubmit={(event) => {
        event.preventDefault()
        subscription.mutate(email)
      }}
    >
      <div className="flex flex-col gap-4">
        <label htmlFor={inputId} className="text-lg leading-4 font-bold">
          Antecipe-se ao próximo lançamento
        </label>
        <div className="flex h-10 items-center rounded-[6px] bg-surface-dark drop-shadow-[0_0_10px_rgba(10,6,4,0.45)]">
          <input
            id={inputId}
            type="email"
            required
            autoComplete="email"
            placeholder="digite seu e-mail..."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent pl-3 text-sm leading-4 outline-none placeholder:text-subtle"
          />
          <button
            type="submit"
            disabled={subscription.isPending}
            className="flex h-10 w-[85px] shrink-0 items-center justify-center rounded-r-[6px] bg-primary pr-1 pl-4 text-lg leading-4 font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
          >
            Enviar
          </button>
        </div>
      </div>
      <p aria-live="polite" className="text-[13px] leading-[22px] text-muted-foreground">
        {subscription.isSuccess
          ? 'Inscrição confirmada. Obrigado!'
          : subscription.isError
            ? 'Não foi possível concluir a inscrição. Tente novamente.'
            : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </form>
  )
}
