/**
 * Failure scenarios for the simulated API. Enable them from the browser console
 * (`__kurioMock.enable('payment-failure')`) or by writing a comma-separated list to
 * `localStorage['kurio.mock.scenarios']` before the page loads (used by the e2e tests).
 */
export const MOCK_SCENARIOS = [
  /** Payments settle as failed. */
  'payment-failure',
  /** Payments stay pending well past the client timeout, then confirm. */
  'payment-timeout',
  /** Next checkout quote raises the price of the first cart item. One-shot. */
  'price-change',
  /** Next checkout quote sells out the first cart line. One-shot. */
  'out-of-stock',
  /** Next order request answers after the client timeout (the order is still created). One-shot. */
  'slow-order',
  /** Next order request fails with 503. One-shot. */
  'server-error',
  /** Random price and availability changes broadcast every few seconds. */
  'live-market',
  /** Removes the artificial network latency. */
  'no-latency',
  /** Each request waits a random 300–1500 ms. */
  'variable-latency',
  /** A request that arrives while others wait answers before them, so responses come back out of order. */
  'out-of-order',
  /** API requests fail as if there were no connection and the socket drops until it is turned off. */
  'offline',
  /** Every API request answers 500. */
  'http-500',
  /** Every API request answers 429. */
  'http-429',
  /** Adding or removing favorites fails with 500. */
  'favorites-failure',
  /** Every realtime event is delivered twice, followed by the previous event of the same item. */
  'unreliable-events',
  /** The wallet refuses connection requests. */
  'wallet-rejected',
] as const

export type MockScenario = (typeof MOCK_SCENARIOS)[number]

const STORAGE_KEY = 'kurio.mock.scenarios'

function read(): Set<MockScenario> {
  const raw = localStorage.getItem(STORAGE_KEY) ?? ''
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is MockScenario => (MOCK_SCENARIOS as readonly string[]).includes(item)),
  )
}

function write(scenarios: Set<MockScenario>) {
  localStorage.setItem(STORAGE_KEY, [...scenarios].join(','))
}

export function isScenarioActive(scenario: MockScenario) {
  return read().has(scenario)
}

/** Returns whether the scenario was active and turns it off. */
export function consumeScenario(scenario: MockScenario) {
  const scenarios = read()
  if (!scenarios.has(scenario)) return false
  scenarios.delete(scenario)
  write(scenarios)
  return true
}

export function enableScenario(scenario: MockScenario) {
  const scenarios = read()
  scenarios.add(scenario)
  write(scenarios)
}

export function disableScenario(scenario: MockScenario) {
  const scenarios = read()
  scenarios.delete(scenario)
  write(scenarios)
}

export function activeScenarios() {
  return [...read()]
}
