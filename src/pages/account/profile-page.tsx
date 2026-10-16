import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import imageIcon from '@/assets/icons/image.svg'
import { EnsInput, Field, FormMessage, PasswordInput, TextInput } from '@/components/ui/form-field'
import { IconFrame } from '@/components/ui/icon-frame'
import { AccountLayout } from '@/features/account/components/account-layout'
import { useSession } from '@/features/auth/session-store'
import type { User } from '@/features/auth/types'
import { useChangePassword, useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from '@/features/profile/api'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { hasErrors, useForm } from '@/lib/use-form'
import {
  validatePasswordChange,
  validateProfile,
  type FieldErrors,
  type PasswordValues,
  type ProfileValues,
} from '@/lib/validation'

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const AVATAR_MAX_BYTES = 1024 * 1024

export function ProfilePage() {
  const session = useSession()
  return (
    <AccountLayout section="profile">
      {session && <ProfileForm key={session.user.id} user={session.user} />}
    </AccountLayout>
  )
}

function ProfileForm({ user }: { user: User }) {
  const profile = useForm<ProfileValues>({
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
  })
  const password = useForm<PasswordValues>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [result, setResult] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const wantsPasswordChange = Object.values(password.values).some((value) => value !== '')
  const pending = updateProfile.isPending || changePassword.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setResult(null)
    const profileErrors = validateProfile(profile.values)
    const passwordErrors = wantsPasswordChange ? validatePasswordChange(password.values) : {}
    profile.setErrors(profileErrors)
    password.setErrors(passwordErrors)
    if (hasErrors(profileErrors) || hasErrors(passwordErrors)) {
      setResult({ tone: 'error', text: 'Revise os campos destacados.' })
      return
    }

    try {
      await updateProfile.mutateAsync(profile.values)
    } catch (error) {
      profile.setErrors((toApiError(error).fieldErrors ?? {}) as FieldErrors<ProfileValues>)
      setResult({ tone: 'error', text: errorMessage(error, 'Não foi possível salvar o perfil.') })
      return
    }

    if (wantsPasswordChange) {
      try {
        await changePassword.mutateAsync({
          currentPassword: password.values.currentPassword,
          newPassword: password.values.newPassword,
        })
        password.setValues({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } catch (error) {
        password.setErrors((toApiError(error).fieldErrors ?? {}) as FieldErrors<PasswordValues>)
        setResult({ tone: 'error', text: errorMessage(error, 'O perfil foi salvo, mas a senha não foi alterada.') })
        return
      }
    }

    setResult({ tone: 'success', text: wantsPasswordChange ? 'Perfil e senha atualizados.' : 'Perfil atualizado.' })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8">
      <h1 className="text-base leading-4 font-bold">Perfil do colecionador</h1>

      <div className="grid gap-6 md:grid-cols-[repeat(2,minmax(0,417px))] md:justify-between">
        <Field label="Nome de exibição" required spacing="relaxed" error={profile.errors.displayName}>
          {(control) => <TextInput autoComplete="nickname" {...profile.input('displayName', control)} />}
        </Field>
        <Field label="Nome de usuário" required spacing="relaxed" error={profile.errors.username}>
          {(control) => <TextInput autoComplete="username" {...profile.input('username', control)} />}
        </Field>
        <Field label="E-mail" required spacing="relaxed" error={profile.errors.email}>
          {(control) => <TextInput type="email" autoComplete="email" {...profile.input('email', control)} />}
        </Field>
        <Field label="Nome ENS" required spacing="relaxed" error={profile.errors.ensName} className="[&>label]:gap-1">
          {(control) => (
            <EnsInput
              id={control.id}
              value={profile.values.ensName}
              invalid={control.invalid}
              describedBy={control.describedBy}
              onChange={(value) => profile.setValue('ensName', value)}
            />
          )}
        </Field>
        <Field label="Apelido da carteira" required spacing="relaxed" error={profile.errors.walletNickname}>
          {(control) => <TextInput {...profile.input('walletNickname', control)} />}
        </Field>
        <AvatarField user={user} />
      </div>

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-6 text-base leading-4 font-medium">Alterar senha</legend>
        <PasswordField label="Senha atual" field="currentPassword" form={password} autoComplete="current-password" />
        <PasswordField label="Nova senha" field="newPassword" form={password} autoComplete="new-password" />
        <PasswordField label="Confirmar nova senha" field="confirmPassword" form={password} autoComplete="new-password" />
      </fieldset>

      {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-10 w-[131px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-ink disabled:opacity-60"
      >
        {pending ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}

type PasswordForm = ReturnType<typeof useForm<PasswordValues>>

function PasswordField({
  label,
  field,
  form,
  autoComplete,
}: {
  label: string
  field: keyof PasswordValues
  form: PasswordForm
  autoComplete: string
}) {
  return (
    <Field label={label} error={form.errors[field]} className="gap-3 md:w-[417px]">
      {(control) => <PasswordInput autoComplete={autoComplete} {...form.input(field, control)} />}
    </Field>
  )
}

function AvatarField({ user }: { user: User }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const updateAvatar = useUpdateAvatar()
  const removeAvatar = useRemoveAvatar()
  const [error, setError] = useState<string | null>(null)

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) return setError('Envie uma imagem PNG, JPG ou WEBP.')
    if (file.size > AVATAR_MAX_BYTES) return setError('A imagem deve ter no máximo 1 MB.')
    setError(null)
    const reader = new FileReader()
    reader.onload = () =>
      updateAvatar.mutate(String(reader.result), {
        onError: (mutationError) => setError(errorMessage(mutationError, 'Não foi possível enviar o avatar.')),
      })
    reader.readAsDataURL(file)
  }

  const pending = updateAvatar.isPending || removeAvatar.isPending

  return (
    <div className="flex flex-col gap-2.5">
      <p id="avatar-label" className="text-[15px] leading-[15px]">
        Avatar
      </p>
      <div className="flex items-center gap-6">
        <span className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-[25px] border border-border bg-surface-raised">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`Avatar de ${user.displayName}`} className="size-full object-cover" />
          ) : (
            <IconFrame src={imageIcon} className="size-6" inner="inset-[11.46%]" bleed="inset-[-4.05%]" />
          )}
        </span>
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-describedby="avatar-label"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
            className="h-10 w-[98px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-ink disabled:opacity-60"
          >
            {updateAvatar.isPending ? 'Enviando…' : 'Alterar'}
          </button>
          <button
            type="button"
            disabled={pending || !user.avatarUrl}
            onClick={() =>
              removeAvatar.mutate(undefined, {
                onError: (mutationError) => setError(errorMessage(mutationError, 'Não foi possível remover o avatar.')),
              })
            }
            className="text-sm leading-4 disabled:opacity-50"
          >
            Remover
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          onChange={onFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  )
}
