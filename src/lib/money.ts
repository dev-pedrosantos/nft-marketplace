/**
 * ETH amounts travel as decimal strings ("1.19") and are computed as integer wei
 * (`bigint`, 18 decimals) so sums and discounts never accumulate float errors.
 */
const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/

export type DecimalString = string

export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value)
}

export function toWei(value: DecimalString): bigint {
  if (!isDecimalString(value)) throw new Error(`Invalid decimal amount: ${value}`)
  const [whole, fraction = ''] = value.split('.')
  const padded = fraction.slice(0, DECIMALS).padEnd(DECIMALS, '0')
  return BigInt(whole) * SCALE + BigInt(padded)
}

export function fromWei(wei: bigint): DecimalString {
  const negative = wei < 0n
  const absolute = negative ? -wei : wei
  const whole = absolute / SCALE
  const fraction = (absolute % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

export function addAmounts(...values: DecimalString[]): DecimalString {
  return fromWei(values.reduce((total, value) => total + toWei(value), 0n))
}

export function subtractAmounts(value: DecimalString, subtrahend: DecimalString): DecimalString {
  const result = toWei(value) - toWei(subtrahend)
  return fromWei(result < 0n ? 0n : result)
}

export function multiplyAmount(value: DecimalString, quantity: number): DecimalString {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid quantity: ${quantity}`)
  return fromWei(toWei(value) * BigInt(quantity))
}

/** `basisPoints` = percentage × 100 (10% → 1000). Rounds down to the wei. */
export function percentOf(value: DecimalString, basisPoints: number): DecimalString {
  return fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)
}

export function compareAmounts(a: DecimalString, b: DecimalString): number {
  const difference = toWei(a) - toWei(b)
  return difference === 0n ? 0 : difference > 0n ? 1 : -1
}

export function minAmount(a: DecimalString, b: DecimalString): DecimalString {
  return compareAmounts(a, b) <= 0 ? a : b
}

export function isZero(value: DecimalString): boolean {
  return toWei(value) === 0n
}

/**
 * Display form used across the design: at least two decimals, trailing zeros
 * trimmed beyond that and half-up rounding at `maxDecimals` ("26.846", "1.19").
 */
export function toDisplayAmount(value: DecimalString, maxDecimals = 6): string {
  const wei = toWei(value)
  const unit = 10n ** BigInt(DECIMALS - maxDecimals)
  const rounded = ((wei + unit / 2n) / unit) * unit
  const [whole, fraction = ''] = fromWei(rounded).split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
