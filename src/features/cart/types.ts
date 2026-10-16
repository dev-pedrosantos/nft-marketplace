import type { EditionId } from '@/features/nfts/types'
import type { DecimalString } from '@/lib/money'

export interface CartLineNft {
  id: string
  name: string
  imageUrl: string
  tokenId: string
}

export type CartIssueType = 'price-changed' | 'insufficient-stock' | 'sold-out'

export interface CartIssue {
  type: CartIssueType
  message: string
}

export interface CartLine {
  id: string
  nft: CartLineNft
  editionId: EditionId
  editionLabel: string
  quantity: number
  /** Highest quantity the line accepts right now (stock and per-line limit). */
  maxQuantity: number
  unitPriceEth: DecimalString
  /** Unit price when the item was added; differs from `unitPriceEth` after a price change. */
  priceAtAddEth: DecimalString
  lineTotalEth: DecimalString
  issue: CartIssue | null
}

export interface AppliedCoupon {
  code: string
  label: string
}

export interface Cart {
  items: CartLine[]
  itemCount: number
  coupon: AppliedCoupon | null
  networkId: string
  subtotalEth: DecimalString
  discountEth: DecimalString
  networkFeeEth: DecimalString
  totalEth: DecimalString
}

export interface CartSummary {
  itemCount: number
}

export interface AddToCartInput {
  nftId: string
  editionId: EditionId
  quantity: number
}
