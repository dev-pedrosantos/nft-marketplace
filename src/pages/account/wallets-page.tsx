import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import radioRingBold from '@/assets/ui/radio-ring-bold.svg'
import { ConfirmDialog } from '@/components/ui/dialog'
import { FormMessage } from '@/components/ui/form-field'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { AccountLayout } from '@/features/account/components/account-layout'
import { nftQueries } from '@/features/nfts/api'
import { useCreateWallet, useDeleteWallet, useUpdateWallet, useWallets } from '@/features/wallets/api'
import { WalletForm } from '@/features/wallets/components/wallet-form'
import { EMPTY_WALLET, toWalletValues } from '@/features/wallets/values'
import type { Wallet, WalletInput, WalletRole } from '@/features/wallets/types'
import { errorMessage } from '@/lib/api/errors'
import { shortenHash } from '@/lib/format'
import { cn } from '@/lib/utils'

export function WalletsPage() {
  const query = useWallets()

  return (
    <AccountLayout section="wallets">
      {query.isPending ? (
        <div role="status" aria-label="Carregando carteiras" className="flex flex-col gap-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        </div>
      ) : query.isError && !query.data ? (
        <ErrorState
          message={errorMessage(query.error, 'Não foi possível carregar suas carteiras.')}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <WalletsContent wallets={query.data} />
      )}
    </AccountLayout>
  )
}

function WalletsContent({ wallets }: { wallets: Wallet[] }) {
  const primary = wallets.find((wallet) => wallet.role === 'primary')
  const secondary = wallets.find((wallet) => wallet.role === 'secondary')

  return (
    <div className="flex flex-col gap-8">
      <PrimaryWallet key={primary?.id ?? 'new'} wallet={primary} />
      <SecondaryWallet key={secondary?.id ?? 'none'} wallet={secondary} primary={primary} />
    </div>
  )
}

function useSaveWallet(role: WalletRole, wallet?: Wallet) {
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const mutation = wallet ? update : create
  const save = (input: WalletInput, onSuccess?: () => void) => {
    if (wallet) update.mutate({ ...input, id: wallet.id }, { onSuccess })
    else create.mutate({ ...input, role }, { onSuccess })
  }
  return { save, pending: mutation.isPending, error: mutation.error, reset: mutation.reset }
}

function PrimaryWallet({ wallet }: { wallet?: Wallet }) {
  const { save, pending, error } = useSaveWallet('primary', wallet)
  const remove = useDeleteWallet()
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4 leading-4">
          <h1 id="primary-wallet-title" className="text-[17px] font-bold">
            Carteira principal
          </h1>
          {wallet ? (
            <button type="button" onClick={() => setConfirming(true)} className="text-base font-medium text-highlight">
              Remover
            </button>
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById('primary-wallet-form')?.querySelector('input')?.focus()}
              className="text-base font-medium text-highlight"
            >
              Adicionar
            </button>
          )}
        </div>
        <p className="text-sm leading-[15px] text-muted-foreground">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
      </header>

      <div id="primary-wallet-form">
        <WalletForm
          idPrefix="primary-wallet"
          initial={wallet ? toWalletValues(wallet) : EMPTY_WALLET}
          submitLabel="Salvar carteira"
          pending={pending}
          error={error}
          success={success}
          onSubmit={(input) => {
            setSuccess(null)
            save(input, () => setSuccess('Carteira principal salva.'))
          }}
        />
      </div>

      {wallet && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Remover carteira principal?"
          description={`A carteira ${wallet.nickname} deixará de aparecer no pagamento.`}
          confirmLabel={remove.isPending ? 'Removendo…' : 'Remover'}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(wallet.id, { onSuccess: () => setConfirming(false) })}
        />
      )}
    </section>
  )
}

function SecondaryWallet({ wallet, primary }: { wallet?: Wallet; primary?: Wallet }) {
  const { save, pending, error } = useSaveWallet('secondary', wallet)
  const remove = useDeleteWallet()
  const { data: filters } = useQuery(nftQueries.filters())
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const sameAsPrimary = Boolean(wallet && primary && wallet.address.toLowerCase() === primary.address.toLowerCase())
  const networkLabel = (id: string) => filters?.networks.find((network) => network.id === id)?.label ?? id

  const copyPrimary = () => {
    if (!primary || sameAsPrimary) return
    save({ ...toWalletValues(primary), walletType: primary.walletType })
  }

  return (
    <section aria-labelledby="secondary-wallet-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 id="secondary-wallet-title" className="text-[17px] leading-4 font-bold">
          Carteira secundária
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={sameAsPrimary}
            disabled={!primary || pending}
            title={primary ? undefined : 'Cadastre a carteira principal primeiro.'}
            onClick={copyPrimary}
            className="flex items-center gap-2 text-sm leading-4 disabled:opacity-50"
          >
            <span className="relative size-4 shrink-0">
              <img src={radioRingBold} alt="" className="absolute inset-0 size-full" />
              {sameAsPrimary && <span className="absolute inset-1 rounded-full bg-primary" />}
            </span>
            Igual à carteira principal
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-4 text-base leading-4 font-medium text-highlight"
          >
            {wallet ? 'Editar' : 'Adicionar'}
          </button>
        </div>
      </div>

      {wallet ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-border p-4">
          <div className="flex flex-col gap-1 text-sm leading-[22px]">
            <p className="text-base font-bold">{wallet.nickname}</p>
            <p className="text-muted-foreground">
              {wallet.ensName ? `${wallet.ensName}.eth` : shortenHash(wallet.address)} • {networkLabel(wallet.networkId)}
            </p>
          </div>
          <button type="button" onClick={() => setConfirming(true)} className="text-sm font-medium text-highlight">
            Remover
          </button>
        </div>
      ) : (
        !editing && (
          <p className="text-sm leading-[15px] text-muted-foreground">
            Você ainda não adicionou uma carteira secundária.
          </p>
        )
      )}

      {error != null && !editing && (
        <FormMessage tone="error">{errorMessage(error, 'Não foi possível salvar a carteira secundária.')}</FormMessage>
      )}

      <div className={cn(!editing && 'hidden')}>
        {editing && (
          <div className="mt-5">
            <WalletForm
              idPrefix="secondary-wallet"
              initial={wallet ? toWalletValues(wallet) : EMPTY_WALLET}
              submitLabel="Salvar carteira"
              pending={pending}
              error={error}
              onCancel={() => setEditing(false)}
              onSubmit={(input) => save(input, () => setEditing(false))}
            />
          </div>
        )}
      </div>

      {wallet && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Remover carteira secundária?"
          description={`A carteira ${wallet.nickname} deixará de aparecer no pagamento.`}
          confirmLabel={remove.isPending ? 'Removendo…' : 'Remover'}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(wallet.id, { onSuccess: () => setConfirming(false) })}
        />
      )}
    </section>
  )
}
