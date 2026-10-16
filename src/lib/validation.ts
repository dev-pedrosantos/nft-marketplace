/**
 * Field rules shared by the forms and the simulated API, so the client shows the
 * same messages the server would return.
 */
export type FieldErrors<T> = Partial<Record<keyof T, string>>

const REQUIRED = 'Campo obrigatório.'

export const isFilled = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export const isWalletAddress = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value.trim())

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/i
const ENS_PATTERN = /^[a-z0-9-]{2,40}(\.[a-z0-9-]{2,40})*$/i
export const PASSWORD_MIN_LENGTH = 8

function required<T>(values: Partial<T>, fields: (keyof T)[], errors: FieldErrors<T>) {
  for (const field of fields) {
    if (!isFilled(values[field])) errors[field] = REQUIRED
  }
}

export function validateEmail(value: unknown) {
  if (!isFilled(value)) return REQUIRED
  return isEmail(value) ? undefined : 'Informe um e-mail válido.'
}

export function validateUsername(value: unknown) {
  if (!isFilled(value)) return REQUIRED
  return USERNAME_PATTERN.test(value.trim())
    ? undefined
    : 'Use de 3 a 30 letras, números, ponto, hífen ou sublinhado.'
}

export function validatePassword(value: unknown) {
  if (!isFilled(value)) return REQUIRED
  return value.length >= PASSWORD_MIN_LENGTH
    ? undefined
    : `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
}

function validateEnsName(value: unknown) {
  if (!isFilled(value)) return REQUIRED
  return ENS_PATTERN.test(value.trim()) ? undefined : 'Use letras, números e hífen.'
}

function compact<T>(errors: FieldErrors<T>): FieldErrors<T> {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors<T>
}

export interface LoginValues {
  email: string
  password: string
}

export function validateLogin(values: Partial<LoginValues>): FieldErrors<LoginValues> {
  return compact<LoginValues>({
    email: validateEmail(values.email),
    password: isFilled(values.password) ? undefined : REQUIRED,
  })
}

export interface RegisterValues {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export function validateRegister(values: Partial<RegisterValues>): FieldErrors<RegisterValues> {
  return compact<RegisterValues>({
    username: validateUsername(values.username),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirmPassword:
      values.confirmPassword === undefined || values.confirmPassword === values.password
        ? undefined
        : 'As senhas não coincidem.',
  })
}

export interface ProfileValues {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}

export function validateProfile(values: Partial<ProfileValues>): FieldErrors<ProfileValues> {
  const errors: FieldErrors<ProfileValues> = {}
  required(values, ['displayName', 'walletNickname'], errors)
  errors.username = validateUsername(values.username)
  errors.email = validateEmail(values.email)
  errors.ensName = validateEnsName(values.ensName)
  return compact(errors)
}

export interface PasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function validatePasswordChange(values: Partial<PasswordValues>): FieldErrors<PasswordValues> {
  return compact<PasswordValues>({
    currentPassword: isFilled(values.currentPassword) ? undefined : REQUIRED,
    newPassword: validatePassword(values.newPassword),
    confirmPassword:
      values.confirmPassword === values.newPassword ? undefined : 'As senhas não coincidem.',
  })
}

export interface WalletValues {
  displayName: string
  nickname: string
  networkId: string
  profileName: string
  address: string
  ensOrSecondary: string
  walletType: string
  referralCode: string
  email: string
  ensName: string
}

export function validateWallet(values: Partial<WalletValues>): FieldErrors<WalletValues> {
  const errors: FieldErrors<WalletValues> = {}
  required(values, ['displayName', 'nickname', 'networkId', 'profileName', 'walletType', 'referralCode'], errors)
  errors.address = !isFilled(values.address)
    ? REQUIRED
    : isWalletAddress(values.address)
      ? undefined
      : 'Informe um endereço 0x com 40 caracteres hexadecimais.'
  errors.email = validateEmail(values.email)
  errors.ensName = validateEnsName(values.ensName)
  return compact(errors)
}

export interface CollectorValues {
  displayName: string
  username: string
  networkId: string
  profileName: string
  walletAddress: string
  walletType: string
  referralCode: string
  email: string
  ensName: string
}

export function validateCollector(values: Partial<CollectorValues>): FieldErrors<CollectorValues> {
  const { address, ...walletErrors } = validateWallet({
    ...values,
    nickname: 'checkout',
    address: values.walletAddress,
  })
  return compact<CollectorValues>({
    ...walletErrors,
    walletAddress: address,
    username: validateUsername(values.username),
  })
}
