export const WALLET_PROVIDERS = [
  { id: 'walletconnect', label: 'WalletConnect' },
  { id: 'metamask', label: 'MetaMask' },
  { id: 'coinbase', label: 'Coinbase Wallet' },
] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]['id']

export const WALLET_TYPES = [
  { id: 'browser', label: 'Carteira de navegador' },
  { id: 'mobile', label: 'Carteira móvel' },
  { id: 'hardware', label: 'Carteira de hardware' },
] as const
export type WalletType = (typeof WALLET_TYPES)[number]['id']

export const ENS_SUFFIXES = ['.eth'] as const

export type WalletRole = 'primary' | 'secondary'

export interface WalletInput {
  displayName: string
  nickname: string
  networkId: string
  profileName: string
  address: string
  ensOrSecondary: string
  walletType: WalletType
  referralCode: string
  email: string
  ensName: string
}

export interface Wallet extends WalletInput {
  id: string
  role: WalletRole
  createdAt: string
}

/** Simulated wallet session that authorizes payments; no real wallet is involved. */
export interface WalletConnection {
  provider: WalletProvider
  address: string
  connectedAt: string
}
