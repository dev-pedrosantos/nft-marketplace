import { expect, test as base, type Page } from '@playwright/test'

export const DEMO_USER = { email: 'colecionador@kurio.com', password: 'kurio123', name: 'Nova Sato' }
export const OTHER_USER = { email: 'ana@kurio.com', password: 'kurio123' }

type MockScenario =
  | 'payment-failure'
  | 'payment-timeout'
  | 'price-change'
  | 'out-of-stock'
  | 'slow-order'
  | 'server-error'
  | 'live-market'
  | 'no-latency'

/**
 * Every test gets a fresh browser context, so the simulated backend (persisted in that
 * context's localStorage) starts from the seed. Latency is disabled to keep the suite fast.
 */
export const test = base.extend<{ scenarios: MockScenario[] }>({
  scenarios: [[], { option: true }],
  page: async ({ page, scenarios }, use) => {
    const initial = ['no-latency', ...scenarios].join(',')
    await page.addInitScript((value) => {
      if (localStorage.getItem('kurio.mock.scenarios') === null) {
        localStorage.setItem('kurio.mock.scenarios', value)
      }
    }, initial)
    await use(page)
  },
})

export { expect }

export async function enableScenario(page: Page, scenario: MockScenario) {
  await waitForMocks(page)
  await page.evaluate((name) => window.__kurioMock!.enable(name), scenario)
}

export async function disableScenario(page: Page, scenario: MockScenario) {
  await waitForMocks(page)
  await page.evaluate((name) => window.__kurioMock!.disable(name), scenario)
}

export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => Boolean(window.__kurioMock))
}

export async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => (window.__kurioMock?.realtimeClients() ?? 0) > 0)
}

export function authDialog(page: Page) {
  return page.getByRole('dialog')
}

/** Fills the sign-in form that is already open (from `?auth=login` or a redirect). */
export async function submitLogin(page: Page, user: { email: string; password: string } = DEMO_USER) {
  const dialog = authDialog(page)
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

export async function login(page: Page, user: { email: string; password: string } = DEMO_USER) {
  await page.goto('/?auth=login')
  await submitLogin(page, user)
}

declare global {
  interface Window {
    __kurioMock?: {
      enable: (scenario: string) => void
      disable: (scenario: string) => void
      reset: () => void
      expireSessions: () => void
      setPrice: (nftId: string, priceEth: string) => void
      setAvailability: (nftId: string, editionId: string, available: number) => void
      realtimeClients: () => number
    }
  }
}
