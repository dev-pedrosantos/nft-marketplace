import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import kebab from '@/assets/icons/kebab.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import checkboxRing from '@/assets/ui/checkbox-ring.svg'
import dividerPrimary from '@/assets/ui/divider-primary.svg'
import iconCircle from '@/assets/ui/icon-circle.svg'
import radioCheckedSm from '@/assets/ui/radio-checked-sm.svg'
import radioChecked from '@/assets/ui/radio-checked.svg'
import radioRingSoft from '@/assets/ui/radio-ring-soft.svg'
import radioRing from '@/assets/ui/radio-ring.svg'
import { MobileScreenHeader } from '@/components/layout/mobile-screen-header'
import { Breadcrumb, PageShell } from '@/components/layout/page-shell'
import { ConfirmDialog } from '@/components/ui/dialog'
import { EnsInput, Field, FormMessage, SelectInput, TextInput, inputClass } from '@/components/ui/form-field'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useSession, useViewerKey } from '@/features/auth/session-store'
import type { User } from '@/features/auth/types'
import { DEFAULT_NETWORK_ID, cartQueries } from '@/features/cart/api'
import { OrderTotals } from '@/features/cart/components/order-totals'
import { PromoCode } from '@/features/cart/components/promo-code'
import type { Cart } from '@/features/cart/types'
import { nftQueries } from '@/features/nfts/api'
import { useCheckout } from '@/features/orders/use-checkout'
import { useConnectWallet, useDisconnectWallet, useWalletConnection, useWallets } from '@/features/wallets/api'
import {
  WALLET_PROVIDERS,
  WALLET_TYPES,
  type Wallet,
  type WalletConnection,
  type WalletProvider,
  type WalletType,
} from '@/features/wallets/types'
import { errorMessage } from '@/lib/api/errors'
import { formatEth, shortenHash } from '@/lib/format'
import { hasErrors, useForm } from '@/lib/use-form'
import { cn } from '@/lib/utils'
import { validateCollector, type CollectorValues } from '@/lib/validation'

interface CheckoutValues extends CollectorValues {
  ensOrSecondary: string
  note: string
}

const EMPTY_VALUES: CheckoutValues = {
  displayName: '',
  username: '',
  networkId: '',
  profileName: '',
  walletAddress: '',
  walletType: '',
  referralCode: '',
  email: '',
  ensName: '',
  ensOrSecondary: '',
  note: '',
}

function valuesFrom(user: User, wallet: Wallet | undefined, note = ''): CheckoutValues {
  if (!wallet) return { ...EMPTY_VALUES, username: user.username, email: user.email, displayName: user.displayName, note }
  return {
    displayName: wallet.displayName,
    username: user.username,
    networkId: wallet.networkId,
    profileName: wallet.profileName,
    walletAddress: wallet.address,
    walletType: wallet.walletType,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
    ensOrSecondary: wallet.ensOrSecondary,
    note,
  }
}

const GRADIENT_BUTTON =
  'h-[60px] w-full rounded-[40px] bg-[linear-gradient(96deg,rgb(210_138_76/0.54)_0%,var(--primary)_100%)] text-base leading-4 font-bold disabled:opacity-60'

export function CheckoutPage() {
  const session = useSession()
  const wallets = useWallets()

  return (
    <PageShell active="market" divider={false}>
      <div className="flex flex-col gap-3 max-md:px-7 max-md:pt-8">
        <MobileScreenHeader title="Pagamento com carteira" />
        <Breadcrumb
          items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }, { label: 'Pagamento' }]}
        />
        <h1 className="hidden md:block md:sr-only">Pagamento</h1>
        {!session || wallets.isPending ? (
          <CheckoutSkeleton />
        ) : wallets.isError ? (
          <ErrorState
            message={errorMessage(wallets.error, 'Não foi possível carregar suas carteiras.')}
            onRetry={() => wallets.refetch()}
            retrying={wallets.isFetching}
          />
        ) : (
          <CheckoutContent user={session.user} wallets={wallets.data} />
        )}
      </div>
    </PageShell>
  )
}

function CheckoutContent({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const navigate = useNavigate()
  const viewer = useViewerKey()
  const primary = wallets.find((wallet) => wallet.role === 'primary') ?? wallets[0]
  const secondary = wallets.find((wallet) => wallet.role === 'secondary')
  const form = useForm<CheckoutValues>(valuesFrom(user, primary))
  const [selectedWalletId, setSelectedWalletId] = useState(primary?.id ?? null)
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const connection = useWalletConnection()
  const connectWallet = useConnectWallet()
  const disconnectWallet = useDisconnectWallet()
  const [chosenProvider, setChosenProvider] = useState<WalletProvider | null>(null)
  // A wallet connected earlier stays selected until the collector picks another or disconnects.
  const provider = chosenProvider ?? connection.data?.provider ?? null
  const walletConnected = provider !== null && connection.data?.provider === provider
  const [providerError, setProviderError] = useState<string | null>(null)
  const networkId = form.values.networkId || DEFAULT_NETWORK_ID
  const cart = useQuery(cartQueries.detail(viewer, networkId))
  const checkout = useCheckout({
    onPlaced: (order) => void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } }),
  })

  const selectWallet = (wallet: Wallet) => {
    setSelectedWalletId(wallet.id)
    form.setValues((current) => valuesFrom(user, wallet, current.note))
    form.setErrors({})
  }

  const toggleOtherWallet = () => {
    const next = !useOtherWallet
    setUseOtherWallet(next)
    const wallet = next ? secondary : primary
    if (wallet) selectWallet(wallet)
  }

  const selectProvider = (id: WalletProvider) => {
    // The wallet prompt is already open; a second request could resolve first.
    if (connectWallet.isPending) return
    setChosenProvider(id)
    setProviderError(null)
    if (connection.data?.provider !== id) connectWallet.mutate(id)
  }

  const disconnect = () =>
    disconnectWallet.mutate(undefined, {
      onSuccess: () => {
        setChosenProvider(null)
        connectWallet.reset()
      },
    })

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!cart.data) return
    const errors = validateCollector(form.values)
    form.setErrors(errors)
    setProviderError(
      !provider
        ? 'Selecione uma carteira para pagar.'
        : !walletConnected
          ? `Conecte a carteira ${providerLabel(provider)} para pagar.`
          : null,
    )
    if (hasErrors(errors) || !provider || !walletConnected) return
    void checkout.submit({
      networkId,
      expectedTotalEth: cart.data.totalEth,
      walletProvider: provider,
      collector: {
        ...form.values,
        walletType: form.values.walletType as WalletType,
        useOtherWallet,
      },
    })
  }

  if (cart.isPending) return <CheckoutSkeleton />
  if (cart.isError) {
    return (
      <ErrorState
        message={errorMessage(cart.error, 'Não foi possível carregar o carrinho.')}
        onRetry={() => cart.refetch()}
        retrying={cart.isFetching}
      />
    )
  }
  if (cart.data.items.length === 0 && checkout.hasUnresolvedAttempt) {
    return (
      <EmptyState
        title="Sua compra anterior ainda não foi confirmada"
        description="A última tentativa de pagamento não recebeu resposta. Verifique o resultado antes de comprar de novo: nenhuma cobrança será repetida."
        action={
          <div className="flex flex-col items-center gap-3">
            {checkout.error && <FormMessage tone="error">{checkout.error.message}</FormMessage>}
            <button
              type="button"
              onClick={() => void checkout.resume()}
              disabled={checkout.submitting}
              aria-busy={checkout.submitting}
              className="h-10 rounded-[3px] bg-primary px-6 text-[15px] leading-4 font-bold text-ink disabled:opacity-60"
            >
              {checkout.submitting ? 'Verificando…' : 'Verificar compra'}
            </button>
          </div>
        }
      />
    )
  }
  if (cart.data.items.length === 0) {
    return (
      <EmptyState
        title="Não há itens para pagar"
        description="Seu carrinho está vazio. Adicione NFTs antes de finalizar a compra."
        action={
          <Link to="/" hash="catalogo" className="text-[15px] text-highlight">
            Continuar explorando
          </Link>
        }
      />
    )
  }

  const collectorErrors = hasErrors(form.errors)
  const status = (
    <CheckoutStatus
      cart={cart.data}
      error={checkout.error}
      collectorErrors={collectorErrors}
      providerError={providerError}
      onRetry={() => submit()}
      retrying={checkout.submitting}
    />
  )
  const walletStatus = (
    <WalletConnectionStatus
      provider={provider}
      connection={connection.data ?? null}
      connecting={connectWallet.isPending}
      error={connectWallet.isError ? errorMessage(connectWallet.error, 'Não foi possível conectar a carteira.') : null}
      onRetry={() => provider && connectWallet.mutate(provider)}
      onDisconnect={disconnect}
      disconnecting={disconnectWallet.isPending}
    />
  )
  const submitDisabled = checkout.submitting || connectWallet.isPending

  return (
    <>
      <form noValidate onSubmit={submit} aria-label="Pagamento" className="hidden gap-8 md:flex md:flex-col xl:flex-row">
        <CollectorForm
          form={form}
          useOtherWallet={useOtherWallet}
          onToggleOtherWallet={toggleOtherWallet}
          hasSecondary={Boolean(secondary)}
        />
        <div className="flex w-full flex-col gap-3 xl:w-[405px] xl:shrink-0">
          <h2 className="text-[17px] leading-4 font-bold">Seus NFTs</h2>
          <CheckoutLines cart={cart.data} />
          <CheckoutPromo cart={cart.data} networkId={networkId} />
          <OrderTotals variant="checkout" {...cart.data} />
          <fieldset className="mt-3 flex flex-col gap-5">
            <legend className="mb-5 w-full text-center text-[17px] leading-4 font-bold">Carteira e rede</legend>
            <div role="radiogroup" aria-label="Carteira para pagamento" className="flex flex-col gap-4">
              {WALLET_PROVIDERS.map((option) => (
                <DesktopProviderOption
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={provider === option.id}
                  onSelect={() => selectProvider(option.id)}
                />
              ))}
            </div>
            {walletStatus}
          </fieldset>
          <div className="mt-3 flex flex-col gap-3">
            {status}
            <button
              type="submit"
              disabled={submitDisabled}
              aria-busy={checkout.submitting}
              className="h-[45px] w-full rounded-[8px] bg-primary px-4 text-[15px] leading-4 font-bold text-ink disabled:opacity-60"
            >
              {checkout.submitting ? 'Processando…' : 'Confirmar compra'}
            </button>
          </div>
        </div>
      </form>

      <MobileCheckout
        cart={cart.data}
        wallets={wallets}
        selectedWalletId={selectedWalletId}
        onSelectWallet={selectWallet}
        provider={provider}
        onSelectProvider={selectProvider}
        walletStatus={walletStatus}
        status={status}
        submitting={checkout.submitting}
        submitDisabled={submitDisabled}
        onSubmit={() => submit()}
      />

      <ConfirmDialog
        open={Boolean(checkout.pendingReview)}
        onOpenChange={(open) => !open && checkout.dismissReview()}
        title="Os valores mudaram"
        description={
          checkout.pendingReview && (
            <div className="flex flex-col gap-3">
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {checkout.pendingReview.changes.map((change) => (
                  <li key={change.message}>{change.message}</li>
                ))}
              </ul>
              <p>
                Novo total:{' '}
                <strong className="text-highlight">{formatEth(checkout.pendingReview.totalEth)}</strong>
              </p>
            </div>
          )
        }
        cancelLabel="Revisar"
        confirmLabel="Confirmar novo total"
        onConfirm={() => void checkout.acceptReview()}
        pending={checkout.submitting}
      />
    </>
  )
}

/* ------------------------------ Desktop pieces ------------------------------ */

type CheckoutForm = ReturnType<typeof useForm<CheckoutValues>>

function CollectorForm({
  form,
  useOtherWallet,
  onToggleOtherWallet,
  hasSecondary,
}: {
  form: CheckoutForm
  useOtherWallet: boolean
  onToggleOtherWallet: () => void
  hasSecondary: boolean
}) {
  const { data: filters } = useQuery(nftQueries.filters())
  const { errors } = form

  return (
    <section aria-labelledby="collector-title" className="flex min-w-0 flex-1 flex-col gap-3">
      <h2 id="collector-title" className="text-[17px] leading-4 font-bold">
        Perfil do colecionador
      </h2>
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="Nome de exibição" required spacing="flush" error={errors.displayName}>
              {(control) => <TextInput autoComplete="name" {...form.input('displayName', control)} />}
            </Field>
            <Field label="Rede" required spacing="flush" error={errors.networkId}>
              {(control) => (
                <SelectInput arrowSize="md" required {...form.input('networkId', control)}>
                  <option value="" disabled>
                    Selecione uma rede
                  </option>
                  {filters?.networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.label}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label="Endereço da carteira" required spacing="flush" error={errors.walletAddress}>
              {(control) => (
                <TextInput
                  placeholder="Endereço 0x da carteira"
                  autoComplete="off"
                  spellCheck={false}
                  {...form.input('walletAddress', control)}
                />
              )}
            </Field>
            <Field label="Tipo de carteira" required spacing="flush" error={errors.walletType}>
              {(control) => (
                <SelectInput arrowSize="md" required {...form.input('walletType', control)}>
                  <option value="" disabled>
                    Selecione uma carteira
                  </option>
                  {WALLET_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label="E-mail" required spacing="flush" error={errors.email}>
              {(control) => <TextInput type="email" autoComplete="email" {...form.input('email', control)} />}
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Nome de usuário" required spacing="flush" error={errors.username}>
              {(control) => <TextInput autoComplete="username" {...form.input('username', control)} />}
            </Field>
            <Field label="Nome do perfil" required spacing="flush" error={errors.profileName}>
              {(control) => <TextInput {...form.input('profileName', control)} />}
            </Field>
            <div className="flex min-h-[69px] flex-col justify-end">
              <Field label="ENS ou carteira secundária (opcional)" className="[&>label]:sr-only">
                {(control) => (
                  <TextInput
                    placeholder="ENS ou carteira secundária (opcional)"
                    {...form.input('ensOrSecondary', control)}
                  />
                )}
              </Field>
            </div>
            <Field label="Código de indicação" required spacing="flush" error={errors.referralCode}>
              {(control) => <TextInput autoComplete="off" {...form.input('referralCode', control)} />}
            </Field>
            <Field label="Nome ENS" required spacing="flush" error={errors.ensName}>
              {(control) => (
                <EnsInput
                  {...control}
                  arrowSize="md"
                  value={form.values.ensName}
                  onChange={(value) => form.setValue('ensName', value)}
                />
              )}
            </Field>
          </div>
        </div>

        <label className={cn('flex w-fit items-center gap-2 text-[15px]', !hasSecondary && 'opacity-60')}>
          <input
            type="checkbox"
            checked={useOtherWallet}
            disabled={!hasSecondary}
            onChange={onToggleOtherWallet}
            className="peer sr-only"
          />
          <span className="relative grid size-[15px] place-items-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
            <img src={checkboxRing} alt="" className="absolute inset-0 size-full" />
            {useOtherWallet && <span className="size-[7px] rounded-full bg-primary" />}
          </span>
          Usar outra carteira?
          {!hasSecondary && <span className="sr-only">(cadastre uma carteira secundária para usar)</span>}
        </label>

        <Field label="Observação do colecionador (opcional)" className="w-full max-w-[350px] gap-3">
          {(control) => (
            <textarea
              id={control.id}
              value={form.values.note}
              maxLength={500}
              onChange={(event) => form.setValue('note', event.target.value)}
              className={cn(inputClass, 'h-[152px] resize-none py-3')}
            />
          )}
        </Field>
      </div>
    </section>
  )
}

function CheckoutLines({ cart }: { cart: Cart }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base leading-4" aria-hidden>
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <img src={dividerPrimary} alt="" className="block h-px w-full max-w-none opacity-40" />
      <ul aria-label="Itens da compra" className="flex flex-col gap-3">
        {cart.items.map((line) => (
          <li key={line.id} className="flex h-[70px] items-center justify-between bg-surface-card pr-4 pl-1">
            <div className="flex min-w-0 items-center gap-2">
              <img src={line.nft.imageUrl} alt="" className="size-[70px] shrink-0 rounded-[8px] object-cover" />
              <div className="flex w-[154px] min-w-0 flex-col gap-1.5 leading-4">
                <p className="truncate text-base font-bold">{line.nft.name}</p>
                <p className="truncate text-sm text-subtle">ID do token: {line.nft.tokenId}</p>
              </div>
            </div>
            <p className="flex items-center gap-1.5 leading-4 whitespace-nowrap">
              <span className="text-sm text-muted-foreground">
                <span className="sr-only">Quantidade: </span>(x {line.quantity})
              </span>
              <span className="text-lg font-bold text-highlight">{formatEth(line.lineTotalEth)}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CheckoutPromo({ cart, networkId }: { cart: Cart; networkId: string }) {
  const [open, setOpen] = useState(Boolean(cart.coupon))
  if (open || cart.coupon) return <PromoCode coupon={cart.coupon} networkId={networkId} variant="desktop" />
  return (
    <button type="button" onClick={() => setOpen(true)} className="text-center text-sm leading-4 hover:text-highlight">
      Tem um código promocional? Aplique aqui
    </button>
  )
}

function DesktopProviderOption({
  id,
  label,
  selected,
  onSelect,
}: {
  id: WalletProvider
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'flex h-[45px] w-full items-center gap-2.5 rounded-[3px] border pl-3 text-left',
        selected ? 'gap-3 border-primary pl-4' : 'border-border',
      )}
    >
      {selected ? (
        <img src={radioChecked} alt="" className="h-4 w-[39px] shrink-0" />
      ) : (
        <img src={radioRing} alt="" className="size-4 shrink-0" />
      )}
      {id === 'walletconnect' ? (
        <span className="flex h-[26px] w-[224px] items-center rounded-[6px] border border-border-soft bg-surface-dark pl-2 text-[9px] font-bold tracking-[0.1px] whitespace-pre text-highlight">
          {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
        </span>
      ) : (
        <span className="text-[15px]">{label}</span>
      )}
    </button>
  )
}

/* ------------------------------- Mobile pieces ------------------------------- */

function MobileCheckout({
  cart,
  wallets,
  selectedWalletId,
  onSelectWallet,
  provider,
  onSelectProvider,
  walletStatus,
  status,
  submitting,
  submitDisabled,
  onSubmit,
}: {
  cart: Cart
  wallets: Wallet[]
  selectedWalletId: string | null
  onSelectWallet: (wallet: Wallet) => void
  provider: WalletProvider | null
  onSelectProvider: (id: WalletProvider) => void
  walletStatus: ReactNode
  status: ReactNode
  submitting: boolean
  submitDisabled: boolean
  onSubmit: () => void
}) {
  const { data: filters } = useQuery(nftQueries.filters())
  const networkLabel = (id: string) => filters?.networks.find((network) => network.id === id)?.label ?? id

  return (
    <div className="flex flex-col gap-4 pb-[100px] md:hidden">
      <div className="flex items-center justify-between leading-4 font-bold">
        <h2 className="text-base">Carteira conectada</h2>
        <Link to="/conta/carteiras" className="text-sm text-highlight">
          Trocar carteira
        </Link>
      </div>

      {wallets.length === 0 ? (
        <EmptyState
          title="Nenhuma carteira cadastrada"
          description="Cadastre uma carteira para receber os NFTs."
          action={
            <Link to="/conta/carteiras" className="text-[15px] text-highlight">
              Adicionar carteira
            </Link>
          }
        />
      ) : (
        <div role="radiogroup" aria-label="Carteira que recebe os NFTs" className="flex flex-col gap-5">
          {wallets.map((wallet) => {
            const selected = wallet.id === selectedWalletId
            return (
              <div key={wallet.id} className="relative h-[93px] rounded-[14px] bg-surface-card">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectWallet(wallet)}
                  className="absolute inset-0 rounded-[14px] text-left"
                >
                  <img
                    src={selected ? radioCheckedSm : radioRingSoft}
                    alt=""
                    className="absolute top-[39px] left-[19px] size-4"
                  />
                  <span className="absolute top-[15px] left-[54px] text-base leading-4 font-bold">{wallet.nickname}</span>
                  <span className="absolute top-[38px] left-[54px] text-sm leading-[22px] text-muted-foreground">
                    {wallet.ensOrSecondary || shortenHash(wallet.address)}
                    <br />
                    Rede {networkLabel(wallet.networkId)}
                  </span>
                </button>
                <Link
                  to="/conta/carteiras"
                  aria-label={`Gerenciar carteira ${wallet.nickname}`}
                  className="absolute top-[30px] right-2 grid h-8 w-6 place-items-center"
                >
                  <img src={kebab} alt="" className="h-[15px] w-[3px]" />
                </Link>
              </div>
            )
          })}
        </div>
      )}

      <section aria-labelledby="mobile-providers" className="flex flex-col gap-4">
        <h2 id="mobile-providers" className="text-base leading-4 font-bold">
          Carteira e rede
        </h2>
        <div role="radiogroup" aria-labelledby="mobile-providers" className="flex flex-col gap-4">
          {WALLET_PROVIDERS.map((option) => {
            const selected = provider === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectProvider(option.id)}
                className="relative h-[65px] w-full rounded-[15px] bg-surface-card text-left shadow-[0_0_20px_rgba(10,6,4,0.45)]"
              >
                <span className="absolute top-[13px] left-[14px] grid size-10 place-items-center">
                  <img src={iconCircle} alt="" className="absolute inset-0 size-full" />
                  {option.id === 'coinbase' ? (
                    <img src={walletIcon} alt="" className="relative size-6 p-[2px]" />
                  ) : (
                    <span aria-hidden className="relative text-sm font-bold text-highlight">
                      {option.id === 'walletconnect' ? 'W' : 'M'}
                    </span>
                  )}
                </span>
                <span className="absolute top-[25px] left-[65px] text-sm leading-4">{option.label}</span>
                <img
                  src={selected ? radioCheckedSm : radioRingSoft}
                  alt=""
                  className="absolute top-[25px] right-[17px] size-4"
                />
              </button>
            )
          })}
        </div>
        {walletStatus}
      </section>

      <p className="flex justify-end gap-7 leading-4 font-bold">
        <span className="text-base">Total:</span>
        <span className="text-lg text-highlight">{formatEth(cart.totalEth)}</span>
      </p>

      {status}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-ink/90 px-7 pt-3 pb-8">
        <button type="button" onClick={onSubmit} disabled={submitDisabled} aria-busy={submitting} className={GRADIENT_BUTTON}>
          {submitting ? 'Processando…' : 'Confirmar compra'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------- Shared pieces ------------------------------- */

function providerLabel(id: WalletProvider) {
  return WALLET_PROVIDERS.find((option) => option.id === id)?.label ?? id
}

/** Live region that stays in the DOM (hidden while empty) so connection changes are announced. */
function WalletConnectionStatus({
  provider,
  connection,
  connecting,
  error,
  onRetry,
  onDisconnect,
  disconnecting,
}: {
  provider: WalletProvider | null
  connection: WalletConnection | null
  connecting: boolean
  error: string | null
  onRetry: () => void
  onDisconnect: () => void
  disconnecting: boolean
}) {
  const label = provider && providerLabel(provider)
  return (
    <div aria-live="polite" className="text-sm leading-5 empty:hidden">
      {provider && connecting ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <span
            aria-hidden
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
          Aguardando aprovação na carteira {label}…
        </p>
      ) : provider && error ? (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-coral">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="font-bold text-highlight underline">
            Conectar de novo
          </button>
        </p>
      ) : provider && connection?.provider === provider ? (
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span>
            <span className="font-bold text-highlight">{label} conectada</span>{' '}
            <span className="text-muted-foreground">· {shortenHash(connection.address)}</span>
          </span>
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnecting}
            className="font-bold text-highlight underline disabled:opacity-60"
          >
            Desconectar
          </button>
        </p>
      ) : null}
    </div>
  )
}

function CheckoutStatus({
  cart,
  error,
  collectorErrors,
  providerError,
  onRetry,
  retrying,
}: {
  cart: Cart
  error: { message: string; retryable: boolean } | null
  collectorErrors: boolean
  providerError: string | null
  onRetry: () => void
  retrying: boolean
}) {
  const statusRef = useRef<HTMLDivElement>(null)
  const hasIssues = cart.items.some((line) => line.issue)

  useEffect(() => {
    if (error) statusRef.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  return (
    <div ref={statusRef} className="flex flex-col gap-2 empty:hidden">
      {hasIssues && (
        <FormMessage tone="error">
          Alguns itens mudaram de preço ou disponibilidade.{' '}
          <Link to="/carrinho" className="font-bold text-highlight underline">
            Revise o carrinho
          </Link>
        </FormMessage>
      )}
      {collectorErrors && <FormMessage tone="error">Revise os dados do colecionador destacados.</FormMessage>}
      {providerError && <FormMessage tone="error">{providerError}</FormMessage>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-5 text-coral">
          <span>{error.message}</span>
          {error.retryable && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="font-bold text-highlight underline disabled:opacity-60"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Carregando pagamento" className="flex flex-col gap-6 md:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-[69px]" />
        ))}
      </div>
      <Skeleton className="h-[420px] md:w-[405px]" />
    </div>
  )
}
