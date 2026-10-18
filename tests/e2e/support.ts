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
  | 'variable-latency'
  | 'out-of-order'
  | 'offline'
  | 'http-500'
  | 'http-429'
  | 'favorites-failure'
  | 'unreliable-events'
  | 'wallet-rejected'

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

export type WalletLabel = 'MetaMask' | 'Coinbase Wallet' | 'WalletConnect'

/** Picks the payment wallet on the checkout and waits for the simulated approval. */
export async function connectWallet(page: Page, label: WalletLabel = 'MetaMask') {
  await page.getByRole('radio', { name: label, exact: true }).filter({ visible: true }).click()
  await expect(page.getByText(`${label} conectada`).filter({ visible: true })).toBeVisible()
}

export interface ApiPurchase {
  token: string
  body: { quoteId: string; walletProvider: string; collector: Record<string, unknown> }
}

/**
 * Signs in and reviews the cart straight through the simulated API, outside the app session.
 * Returns what `POST /orders` needs. MetaMask is connected unless `connect` is false.
 */
export async function prepareApiPurchase(page: Page, { user = DEMO_USER, connect = true } = {}) {
  await waitForMocks(page)
  return page.evaluate(
    async ({ owner, connect }) => {
      const json = (response: Response) => {
        if (!response.ok) throw new Error(`${response.url} → ${response.status}`)
        return response.json()
      }
      const session = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: owner.email, password: owner.password }),
      }).then(json)
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }
      if (connect) {
        await fetch('/api/me/wallet-connection', {
          method: 'POST',
          headers,
          body: JSON.stringify({ provider: 'metamask' }),
        }).then(json)
      }
      const wallets = await fetch('/api/me/wallets', { headers }).then(json)
      const wallet = wallets.find((item: { role: string }) => item.role === 'primary')
      const cart = await fetch(`/api/cart?network=${wallet.networkId}`, { headers }).then(json)
      const quote = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers,
        body: JSON.stringify({ networkId: wallet.networkId, expectedTotalEth: cart.totalEth }),
      }).then(json)
      return {
        token: session.token as string,
        body: {
          quoteId: quote.id as string,
          walletProvider: 'metamask',
          collector: {
            displayName: wallet.displayName,
            username: session.user.username,
            networkId: wallet.networkId,
            profileName: wallet.profileName,
            walletAddress: wallet.address,
            walletType: wallet.walletType,
            referralCode: wallet.referralCode,
            email: wallet.email,
            ensName: wallet.ensName,
            ensOrSecondary: wallet.ensOrSecondary,
            useOtherWallet: false,
            note: '',
          },
        },
      }
    },
    { owner: user, connect },
  )
}

/** Sends `POST /orders` from the page and returns the status and the JSON body. */
export function postOrder(page: Page, purchase: ApiPurchase, idempotencyKey: string) {
  return page.evaluate(
    async ({ purchase, idempotencyKey }) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${purchase.token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(purchase.body),
      })
      return { status: response.status, body: await response.json() }
    },
    { purchase, idempotencyKey },
  )
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
      redeliverEvent: (eventId: string) => boolean
    }
  }
}
