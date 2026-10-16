import { useQuery } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { EnsInput, Field, FormMessage, SelectInput, TextInput } from '@/components/ui/form-field'
import { nftQueries } from '@/features/nfts/api'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { hasErrors, useForm } from '@/lib/use-form'
import { validateWallet, type FieldErrors, type WalletValues } from '@/lib/validation'
import { WALLET_TYPES, type WalletInput } from '../types'

interface WalletFormProps {
  idPrefix: string
  initial: WalletValues
  submitLabel: string
  pending: boolean
  error: unknown
  success?: string | null
  onSubmit: (values: WalletInput) => void
  onCancel?: () => void
}

export function WalletForm({ idPrefix, initial, submitLabel, pending, error, success, onSubmit, onCancel }: WalletFormProps) {
  const form = useForm<WalletValues>(initial)
  const { data: filters } = useQuery(nftQueries.filters())
  const serverFieldErrors = error ? (toApiError(error).fieldErrors as FieldErrors<WalletValues> | undefined) : undefined
  const errors = { ...serverFieldErrors, ...form.errors }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const validation = validateWallet(form.values)
    form.setErrors(validation)
    if (hasErrors(validation)) return
    onSubmit({ ...form.values, walletType: form.values.walletType as WalletInput['walletType'] })
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${idPrefix}-title`} className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-[repeat(2,minmax(0,417px))] md:justify-between">
        <Field label="Nome de exibição" required error={errors.displayName}>
          {(control) => <TextInput {...form.input('displayName', control)} />}
        </Field>
        <Field label="Apelido da carteira" required error={errors.nickname}>
          {(control) => <TextInput {...form.input('nickname', control)} />}
        </Field>
        <Field label="Rede" required error={errors.networkId} className="[&>label]:gap-1">
          {(control) => (
            <SelectInput required {...form.input('networkId', control)}>
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
        <Field label="Nome do perfil" required error={errors.profileName}>
          {(control) => <TextInput {...form.input('profileName', control)} />}
        </Field>
        <Field label="Endereço da carteira" required error={errors.address}>
          {(control) => (
            <TextInput
              autoComplete="off"
              spellCheck={false}
              placeholder="Endereço 0x da carteira"
              {...form.input('address', control)}
            />
          )}
        </Field>
        <Field error={errors.ensOrSecondary} className="self-end">
          {(control) => (
            <TextInput
              aria-label="ENS ou carteira secundária (opcional)"
              placeholder="ENS ou carteira secundária (opcional)"
              {...form.input('ensOrSecondary', control)}
            />
          )}
        </Field>
        <Field label="Tipo de carteira" required error={errors.walletType}>
          {(control) => (
            <SelectInput required {...form.input('walletType', control)}>
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
        <Field label="Código de indicação" required error={errors.referralCode}>
          {(control) => <TextInput {...form.input('referralCode', control)} />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(control) => <TextInput type="email" autoComplete="email" {...form.input('email', control)} />}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName} className="[&>label]:gap-1">
          {(control) => (
            <EnsInput
              id={control.id}
              value={form.values.ensName}
              invalid={control.invalid}
              describedBy={control.describedBy}
              onChange={(value) => form.setValue('ensName', value)}
            />
          )}
        </Field>
      </div>

      {error != null && !serverFieldErrors && (
        <FormMessage tone="error">{errorMessage(error, 'Não foi possível salvar a carteira.')}</FormMessage>
      )}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-10 min-w-[131px] rounded-[3px] bg-primary px-4 text-sm leading-4 font-bold text-ink disabled:opacity-60"
        >
          {pending ? 'Salvando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm leading-4 text-muted-foreground">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
