import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import eyeHiddenSoft from '@/assets/icons/eye-hidden-soft.svg'
import eyeHidden from '@/assets/icons/eye-hidden.svg'
import facebookIcon from '@/assets/brands/facebook.svg'
import google1 from '@/assets/brands/google-1.svg'
import google2 from '@/assets/brands/google-2.svg'
import google3 from '@/assets/brands/google-3.svg'
import google4 from '@/assets/brands/google-4.svg'
import google5 from '@/assets/brands/google-5.svg'
import google6 from '@/assets/brands/google-6.svg'
import google7 from '@/assets/brands/google-7.svg'
import dividerBorder from '@/assets/ui/divider-border.svg'
import type { AuthView } from '@/app/root-search'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FormMessage } from '@/components/ui/form-field'
import { IconFrame } from '@/components/ui/icon-frame'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import {
  validateLogin,
  validateRegister,
  type FieldErrors,
  type LoginValues,
  type RegisterValues,
} from '@/lib/validation'
import { useLogin, useRegister } from '../api'
import { sessionStore, useSessionState } from '../session-store'

const GOOGLE_PARTS = [
  { src: google1, className: 'inset-[57.68%_17.83%_0_7.11%]' },
  { src: google2, className: 'top-[71.33%] right-[17.83%] bottom-0 left-1/2' },
  { src: google3, className: 'inset-[24.69%_75.25%_24.69%_0]' },
  { src: google4, className: 'inset-[38.28%_0_11.97%_47.07%]' },
  { src: google5, className: 'top-[38.28%] right-0 bottom-[11.97%] left-1/2' },
  { src: google6, className: 'inset-[0_17.01%_57.68%_7.11%]' },
  { src: google7, className: 'top-0 right-[17.01%] bottom-[70.51%] left-1/2' },
]

const COPY = {
  login: {
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    mobileTitle: 'Entrar',
    submit: 'Entrar',
    mobileSubmit: 'Entrar',
    switchPrompt: 'Novo na Kurio?',
    switchAction: 'Crie uma conta',
  },
  signup: {
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    mobileTitle: 'Criar perfil de colecionador',
    submit: 'Criar conta',
    mobileSubmit: 'Criar perfil',
    switchPrompt: 'Já tem uma conta?',
    switchAction: 'Entre',
  },
} as const

/**
 * Sign-in and sign-up live in one dialog driven by `?auth=login|signup`, so any
 * screen (or a private-route redirect) can open it without losing its place.
 */
export function AuthDialog() {
  const search = useSearch({ strict: false }) as { auth?: AuthView; redirect?: string }
  const navigate = useNavigate()
  const router = useRouter()
  const { expired, returnTo } = useSessionState()

  const open = search.auth !== undefined || expired
  const view: AuthView = search.auth ?? 'login'

  const clearSearch = () =>
    navigate({
      to: '.',
      search: (previous) => ({ ...previous, auth: undefined, redirect: undefined }),
      replace: true,
      resetScroll: false,
    })

  const close = () => {
    sessionStore.dismissExpired()
    void clearSearch()
  }

  const switchView = (next: AuthView) =>
    navigate({
      to: '.',
      search: (previous) => ({ ...previous, auth: next }),
      replace: true,
      resetScroll: false,
    })

  // The expiry redirect may not have reached the URL yet when the user signs in again.
  const onAuthenticated = () => {
    const target = search.redirect ?? returnTo
    if (target) void router.navigate({ href: target, replace: true })
    else void clearSearch()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        overlayClassName="max-md:bg-ink"
        className={cn(
          'max-md:inset-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:translate-none max-md:bg-ink max-md:px-7 max-md:pt-20 max-md:pb-10',
          'md:w-[500px]',
          view === 'login' ? 'md:pb-[107px]' : 'md:pb-[79px] md:rounded-[8px]',
        )}
      >
        <header className="flex flex-col items-center gap-10 md:px-12 md:pt-12">
          <p aria-hidden className="flex h-[136px] items-center text-[32px] leading-[42px] font-bold tracking-[3.2px] md:hidden">
            KURIO
          </p>
          <DialogTitle className="text-center text-xl leading-4 font-bold md:hidden">
            {COPY[view].mobileTitle}
          </DialogTitle>

          <div role="tablist" aria-label="Acesso" className="hidden items-stretch gap-2 md:flex">
            <ViewTab active={view === 'login'} onClick={() => switchView('login')}>
              Entrar
            </ViewTab>
            <span aria-hidden className="w-px bg-coral" />
            <ViewTab active={view === 'signup'} onClick={() => switchView('signup')}>
              Criar conta
            </ViewTab>
          </div>
          <DialogDescription className="text-center text-[13px] leading-4 max-md:sr-only">
            {COPY[view].description}
          </DialogDescription>
        </header>

        {expired && (
          <div className="mt-6 md:px-20">
            <FormMessage tone="error">Sua sessão expirou. Entre novamente para continuar.</FormMessage>
          </div>
        )}

        {view === 'login' ? (
          <LoginForm key="login" onSuccess={onAuthenticated} />
        ) : (
          <SignupForm key="signup" onSuccess={onAuthenticated} />
        )}

        <SocialBlock spacious={view === 'signup'} />

        <p className="mt-10 text-center text-[15px] leading-5 text-muted-foreground md:hidden">
          {COPY[view].switchPrompt}{' '}
          <button
            type="button"
            onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
            className="font-bold text-highlight"
          >
            {COPY[view].switchAction}
          </button>
        </p>

        <span aria-hidden className="absolute bottom-0 left-0 hidden h-2.5 w-full bg-primary md:block" />
      </DialogContent>
    </Dialog>
  )
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn('text-xl leading-4 font-medium', active ? 'text-highlight' : 'text-foreground')}
    >
      {children}
    </button>
  )
}

const authInputClass =
  'h-[50px] w-full rounded-[10px] border border-border bg-transparent pr-12 pl-4 text-sm leading-4 text-foreground outline-none placeholder:text-subtle focus:border-primary aria-invalid:border-coral md:h-10 md:rounded-[5px]'

function AuthInput({ error, label, ...props }: ComponentProps<'input'> & { label: string; error?: string }) {
  const errorId = `${props.id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="sr-only">
        {label}
      </label>
      <input
        className={authInputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs leading-4 text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

function AuthPasswordInput(props: ComponentProps<'input'> & { label: string; error?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <AuthInput {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute top-4 right-4 size-[18px] md:top-[10px] md:right-[14px] md:size-5"
      >
        <IconFrame
          src={eyeHiddenSoft}
          className="size-full md:hidden"
          inner="inset-[17.71%_11.42%_16.57%_11.46%]"
          bleed="inset-[-5.7%_-4.29%_-5.71%_-4.29%]"
        />
        <IconFrame
          src={eyeHidden}
          className="hidden size-full md:block"
          inner="inset-[17.71%_11.42%_16.57%_11.46%]"
          bleed="inset-[-5.7%_-4.29%_-5.71%_-4.29%]"
        />
      </button>
    </div>
  )
}

function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-10 h-[60px] w-full rounded-[10px] bg-primary text-base leading-4 font-bold text-ink disabled:opacity-60 md:mt-6 md:h-[45px] md:rounded-[5px]"
    >
      {children}
    </button>
  )
}

function useFormState<T extends object>(initial: T) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors<T>>({})
  const bind = (field: keyof T & string) => ({
    id: `auth-${field}`,
    name: field,
    value: String(values[field] ?? ''),
    error: errors[field],
    onChange: (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    },
  })
  return { values, errors, setErrors, bind }
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useFormState<LoginValues>({ email: '', password: '' })
  const login = useLogin()
  const [notice, setNotice] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateLogin(form.values)
    form.setErrors(errors)
    if (Object.keys(errors).length > 0) return
    login.mutate(form.values, { onSuccess })
  }

  return (
    <form noValidate onSubmit={submit} className="mt-10 flex flex-col md:mt-0 md:px-20 md:pt-6">
      <div className="flex flex-col gap-3">
        <AuthInput {...form.bind('email')} label="E-mail" type="email" autoComplete="email" placeholder="contato@email.com" />
        <AuthPasswordInput {...form.bind('password')} label="Senha" autoComplete="current-password" placeholder="Senha" />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setNotice('A recuperação de senha não está disponível nesta demonstração.')}
            className="text-sm leading-4 text-highlight"
          >
            Esqueceu a senha?
          </button>
        </div>
      </div>
      {notice && <div className="mt-3"><FormMessage tone="success">{notice}</FormMessage></div>}
      {login.isError && (
        <div className="mt-3">
          <FormMessage tone="error">{errorMessage(login.error, 'Não foi possível entrar.')}</FormMessage>
        </div>
      )}
      <SubmitButton pending={login.isPending}>
        <span className="md:hidden">{COPY.login.mobileSubmit}</span>
        <span className="max-md:hidden">{login.isPending ? 'Entrando…' : COPY.login.submit}</span>
      </SubmitButton>
    </form>
  )
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useFormState<RegisterValues>({ username: '', email: '', password: '', confirmPassword: '' })
  const register = useRegister()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateRegister(form.values)
    form.setErrors(errors)
    if (Object.keys(errors).length > 0) return
    const { confirmPassword: _confirm, ...input } = form.values
    register.mutate(input, {
      onSuccess,
      onError: (error) => {
        const { fieldErrors } = toApiError(error)
        if (Object.keys(fieldErrors).length > 0) form.setErrors(fieldErrors as FieldErrors<RegisterValues>)
      },
    })
  }

  const serverError = register.isError && Object.keys(toApiError(register.error).fieldErrors).length === 0

  return (
    <form noValidate onSubmit={submit} className="mt-10 flex flex-col md:mt-0 md:px-20 md:pt-6">
      <div className="flex flex-col gap-3">
        <AuthInput {...form.bind('username')} label="Nome de usuário" autoComplete="username" placeholder="Nome de usuário" />
        <AuthInput {...form.bind('email')} label="E-mail" type="email" autoComplete="email" placeholder="Digite seu e-mail" />
        <AuthPasswordInput {...form.bind('password')} label="Senha" autoComplete="new-password" placeholder="Senha" />
        <AuthPasswordInput
          {...form.bind('confirmPassword')}
          label="Confirmar senha"
          autoComplete="new-password"
          placeholder="Confirmar senha"
        />
      </div>
      {serverError && (
        <div className="mt-3">
          <FormMessage tone="error">{errorMessage(register.error, 'Não foi possível criar a conta.')}</FormMessage>
        </div>
      )}
      <SubmitButton pending={register.isPending}>
        <span className="md:hidden">{COPY.signup.mobileSubmit}</span>
        <span className="max-md:hidden">{register.isPending ? 'Criando…' : COPY.signup.submit}</span>
      </SubmitButton>
    </form>
  )
}

/** Third-party sign-in has no backend in the challenge; the buttons explain that instead of failing silently. */
function SocialBlock({ spacious }: { spacious: boolean }) {
  const [notice, setNotice] = useState(false)
  const explain = () => setNotice(true)

  return (
    <div className={cn('mt-10 flex flex-col gap-3 md:mt-6', spacious && 'md:gap-4')}>
      <div className="flex items-center gap-3">
        <img src={dividerBorder} alt="" className="h-px min-w-0 flex-1" />
        <span className="text-[13px] leading-4">Ou continue com</span>
        <img src={dividerBorder} alt="" className="h-px min-w-0 flex-1" />
      </div>
      <div className={cn('flex flex-col gap-4 md:px-20', !spacious && 'md:gap-3')}>
        <SocialButton onClick={explain} label="Continuar com Google">
          <span className="relative size-5 overflow-hidden">
            {GOOGLE_PARTS.map((part) => (
              <img key={part.src} src={part.src} alt="" className={cn('absolute max-w-none', part.className)} />
            ))}
          </span>
        </SocialButton>
        <SocialButton onClick={explain} label="Continuar com Facebook">
          <img src={facebookIcon} alt="" className="size-5" />
        </SocialButton>
        {notice && (
          <FormMessage tone="success">Login social indisponível nesta demonstração. Use e-mail e senha.</FormMessage>
        )}
      </div>
    </div>
  )
}

function SocialButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] leading-4 font-medium text-muted-foreground"
    >
      {children}
      {label}
    </button>
  )
}
