import type { EditionId } from '@/features/nfts/types'
import type { WalletProvider, WalletType } from '@/features/wallets/types'
import type { DecimalString } from '@/lib/money'

export type OrderStatus = 'pending' | 'confirmed' | 'failed'

export interface OrderLine {
  nftId: string
  name: string
  imageUrl: string
  tokenId: string
  editionId: EditionId
  editionLabel: string
  quantity: number
  unitPriceEth: DecimalString
  lineTotalEth: DecimalString
}

export interface CollectorDetails {
  displayName: string
  username: string
  networkId: string
  profileName: string
  walletAddress: string
  ensOrSecondary: string
  walletType: WalletType
  referralCode: string
  email: string
  ensName: string
  useOtherWallet: boolean
  note: string
}

export interface Order {
  id: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  items: OrderLine[]
  subtotalEth: DecimalString
  discountEth: DecimalString
  networkFeeEth: DecimalString
  totalEth: DecimalString
  networkId: string
  networkLabel: string
  walletProvider: WalletProvider
  walletLabel: string
  walletAddress: string
  transactionHash: string | null
  failureReason: string | null
}

export type QuoteChangeType = 'price' | 'availability' | 'coupon' | 'fee'

export interface QuoteChange {
  type: QuoteChangeType
  message: string
}

/** Server-side revalidation of the cart right before payment. */
export interface CheckoutQuote {
  id: string
  expiresAt: string
  items: OrderLine[]
  subtotalEth: DecimalString
  discountEth: DecimalString
  networkId: string
  networkFeeEth: DecimalString
  totalEth: DecimalString
  /** Differences against the totals the client last displayed. */
  changes: QuoteChange[]
}

export interface QuoteRequest {
  networkId: string
  /** Total the user saw; the server reports a change when it no longer matches. */
  expectedTotalEth: DecimalString
}

export interface PlaceOrderInput {
  quoteId: string
  walletProvider: WalletProvider
  collector: CollectorDetails
}

/** Payload of the `order.updated` realtime event. */
export interface OrderUpdate {
  id: string
  status: OrderStatus
  updatedAt: string
}
