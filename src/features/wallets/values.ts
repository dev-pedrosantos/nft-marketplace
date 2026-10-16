import type { WalletValues } from '@/lib/validation'
import type { Wallet, WalletInput } from './types'

export const EMPTY_WALLET: WalletValues = {
  displayName: '',
  nickname: '',
  networkId: '',
  profileName: '',
  address: '',
  ensOrSecondary: '',
  walletType: '',
  referralCode: '',
  email: '',
  ensName: '',
}

export function toWalletValues(wallet: Wallet | WalletInput): WalletValues {
  const { displayName, nickname, networkId, profileName, address, ensOrSecondary, walletType, referralCode, email, ensName } =
    wallet
  return { displayName, nickname, networkId, profileName, address, ensOrSecondary, walletType, referralCode, email, ensName }
}
