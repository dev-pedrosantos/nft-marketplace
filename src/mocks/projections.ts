import type { Cart, CartIssue, CartLine } from '@/features/cart/types'
import type { Nft, NftDetails } from '@/features/nfts/types'
import type { OrderLine } from '@/features/orders/types'
import {
  addAmounts,
  compareAmounts,
  minAmount,
  multiplyAmount,
  percentOf,
  subtractAmounts,
  type DecimalString,
} from '@/lib/money'
import { formatEth } from '@/lib/format'
import { coupons, type CouponRecord } from './data/coupons'
import { MAX_QUANTITY_PER_LINE, NETWORKS, ROYALTIES_INFO, type NftRecord } from './data/nfts'
import { findNft, inventoryOf, type CartRecord } from './db'

const GALLERY_SIZE = 4

export function toNft(record: NftRecord): Nft {
  return {
    id: record.id,
    name: record.name,
    imageUrl: record.imageUrl,
    priceEth: inventoryOf(record.id).priceEth,
    previousPriceEth: record.previousPriceEth,
    isRare: record.isRare,
  }
}

export function networkOf(id: string) {
  return NETWORKS.find((network) => network.id === id) ?? NETWORKS[0]
}

function shortContract(address: string) {
  return `0x${address.slice(2, 6).toUpperCase()}...${address.slice(-4).toUpperCase()}`
}

export function toNftDetails(record: NftRecord): NftDetails {
  const inventory = inventoryOf(record.id)
  const network = networkOf(record.networkId)
  return {
    ...toNft(record),
    tokenId: record.tokenId,
    collection: record.series,
    attributes: record.attributes,
    summary: record.summary,
    description: record.description,
    network: { id: network.id, label: network.label },
    networkInfo: network.info,
    contractInfo: `${shortContract(record.contractAddress)} • Contrato inteligente ERC-721 verificado.`,
    royaltiesInfo: ROYALTIES_INFO,
    // The design repeats the main artwork in every thumbnail.
    gallery: Array.from({ length: GALLERY_SIZE }, () => record.imageUrl),
    rating: record.rating,
    editions: record.editions.map((edition) => ({
      ...edition,
      available: inventory.available[edition.id],
    })),
    defaultEditionId: record.defaultEditionId,
    version: inventory.version,
  }
}

export function editionLabel(record: NftRecord, editionId: string) {
  return record.editions.find((edition) => edition.id === editionId)?.label ?? editionId
}

/* ----------------------------------- Coupons ---------------------------------- */

export type CouponCheck =
  | { ok: true; coupon: CouponRecord; discountEth: DecimalString }
  | { ok: false; status: number; code: string; message: string }

export function checkCoupon(code: string, subtotalEth: DecimalString, now = Date.now()): CouponCheck {
  const coupon = coupons.find((item) => item.code === code.trim().toUpperCase())
  if (!coupon) return { ok: false, status: 404, code: 'COUPON_INVALID', message: 'Código promocional inválido.' }
  if (Date.parse(coupon.expiresAt) <= now) {
    return { ok: false, status: 410, code: 'COUPON_EXPIRED', message: 'Este código promocional expirou.' }
  }
  if (coupon.minSubtotalEth && compareAmounts(subtotalEth, coupon.minSubtotalEth) < 0) {
    return {
      ok: false,
      status: 422,
      code: 'COUPON_MIN_SUBTOTAL',
      message: `Este código exige subtotal mínimo de ${formatEth(coupon.minSubtotalEth)}.`,
    }
  }
  const raw =
    coupon.discount.type === 'percent'
      ? percentOf(subtotalEth, coupon.discount.basisPoints)
      : coupon.discount.amountEth
  return { ok: true, coupon, discountEth: minAmount(raw, subtotalEth) }
}

/* ------------------------------------ Cart ------------------------------------ */

function lineIssue(
  quantity: number,
  available: number,
  unitPriceEth: DecimalString,
  priceAtAddEth: DecimalString,
): CartIssue | null {
  if (available === 0) return { type: 'sold-out', message: 'Esta edição esgotou.' }
  if (quantity > available) {
    return {
      type: 'insufficient-stock',
      message: `Restam apenas ${available} ${available === 1 ? 'unidade' : 'unidades'} desta edição.`,
    }
  }
  if (compareAmounts(unitPriceEth, priceAtAddEth) !== 0) {
    return {
      type: 'price-changed',
      message: `O preço mudou de ${formatEth(priceAtAddEth)} para ${formatEth(unitPriceEth)}.`,
    }
  }
  return null
}

export function computeCart(cart: CartRecord, networkId: string): Cart {
  const items: CartLine[] = []
  for (const line of cart.lines) {
    const record = findNft(line.nftId)
    if (!record) continue
    const inventory = inventoryOf(line.nftId)
    const available = inventory.available[line.editionId]
    items.push({
      id: line.id,
      nft: { id: record.id, name: record.name, imageUrl: record.imageUrl, tokenId: record.tokenId },
      editionId: line.editionId,
      editionLabel: editionLabel(record, line.editionId),
      quantity: line.quantity,
      maxQuantity: Math.min(available, MAX_QUANTITY_PER_LINE),
      unitPriceEth: inventory.priceEth,
      priceAtAddEth: line.priceAtAddEth,
      lineTotalEth: multiplyAmount(inventory.priceEth, line.quantity),
      issue: lineIssue(line.quantity, available, inventory.priceEth, line.priceAtAddEth),
    })
  }

  const subtotalEth = addAmounts('0', ...items.map((item) => item.lineTotalEth))
  const couponCheck = cart.couponCode ? checkCoupon(cart.couponCode, subtotalEth) : null
  const discountEth = couponCheck?.ok ? couponCheck.discountEth : '0'
  const network = networkOf(networkId)
  const networkFeeEth = items.length > 0 ? network.feeEth : '0'

  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    coupon: couponCheck?.ok ? { code: couponCheck.coupon.code, label: couponCheck.coupon.label } : null,
    networkId: network.id,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth: addAmounts(subtractAmounts(subtotalEth, discountEth), networkFeeEth),
  }
}

export function toOrderLines(cart: Cart): OrderLine[] {
  return cart.items.map((item) => ({
    nftId: item.nft.id,
    name: item.nft.name,
    imageUrl: item.nft.imageUrl,
    tokenId: item.nft.tokenId,
    editionId: item.editionId,
    editionLabel: item.editionLabel,
    quantity: item.quantity,
    unitPriceEth: item.unitPriceEth,
    lineTotalEth: item.lineTotalEth,
  }))
}
