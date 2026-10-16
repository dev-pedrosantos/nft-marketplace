import type { DecimalString } from '@/lib/money'

export interface CouponRecord {
  code: string
  label: string
  /** Percentage in basis points (1000 = 10%) or a fixed ETH amount. */
  discount: { type: 'percent'; basisPoints: number } | { type: 'fixed'; amountEth: DecimalString }
  minSubtotalEth?: DecimalString
  expiresAt: string
}

export const coupons: CouponRecord[] = [
  {
    code: 'KURIO10',
    label: 'Desconto do lançamento',
    discount: { type: 'percent', basisPoints: 1000 },
    expiresAt: '2099-12-31T23:59:59Z',
  },
  {
    code: 'LANCAMENTO',
    label: 'Desconto do lançamento',
    discount: { type: 'fixed', amountEth: '0.5' },
    minSubtotalEth: '5',
    expiresAt: '2099-12-31T23:59:59Z',
  },
  {
    code: 'EXPIRADO',
    label: 'Desconto do lançamento',
    discount: { type: 'percent', basisPoints: 2000 },
    expiresAt: '2025-01-01T00:00:00Z',
  },
]
