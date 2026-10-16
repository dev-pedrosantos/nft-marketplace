const ptBrDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dayAndMonth = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** Card prices use a dot as decimal separator, e.g. "1.19 ETH". */
export function formatEth(value: number) {
  return `${value.toFixed(2)} ETH`
}

/** Filter labels use the pt-BR separator, e.g. "0,02 - 12,30 ETH". */
export function formatEthRange(min: number, max: number) {
  return `${ptBrDecimal.format(min)} - ${ptBrDecimal.format(max)} ETH`
}

/** "2026-09-12" → "12 de setembro" */
export function formatDayAndMonth(isoDate: string) {
  return dayAndMonth.format(new Date(isoDate))
}
