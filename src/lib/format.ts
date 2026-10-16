import { isZero, toDisplayAmount, type DecimalString } from './money'

const ptBrDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dayAndMonth = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Prices use a dot as decimal separator, e.g. "1.19 ETH" or "26.846 ETH". */
export function formatEth(value: DecimalString) {
  return `${toDisplayAmount(value)} ETH`
}

/** The design writes an empty discount as "(-) 00.00". */
export function formatDiscount(value: DecimalString) {
  return isZero(value) ? '(-) 00.00' : `(-) ${formatEth(value)}`
}

/** Filter labels use the pt-BR separator, e.g. "0,02 - 12,30 ETH". */
export function formatEthRange(min: number, max: number) {
  return `${ptBrDecimal.format(min)} - ${ptBrDecimal.format(max)} ETH`
}

/** "2026-09-12" → "12 de setembro" */
export function formatDayAndMonth(isoDate: string) {
  return dayAndMonth.format(new Date(isoDate))
}

/** "2026-07-29T…" → "29 Jul, 2026", as in the order receipt. */
export function formatReceiptDate(isoDate: string) {
  const date = new Date(isoDate)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${date.getFullYear()}`
}

/** "0xa91f…e82c" → "0xA91F…E82C", as wallet addresses and hashes appear in the design. */
export function shortenHash(value: string, visible = 4) {
  if (!value.startsWith('0x') || value.length <= visible * 2 + 2) return value
  const body = value.slice(2)
  return `0x${body.slice(0, visible).toUpperCase()}…${body.slice(-visible).toUpperCase()}`
}
