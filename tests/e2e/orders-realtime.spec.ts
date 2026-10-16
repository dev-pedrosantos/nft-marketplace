import type { Page } from '@playwright/test'
import { DEMO_USER, enableScenario, expect, login, OTHER_USER, test, waitForRealtime } from './support.ts'

interface OrderEvent {
  id: string
  status: string
}

/** Records `order.updated` events received by the app's own Socket.IO connection. */
async function recordOrderEvents(page: Page) {
  await waitForRealtime(page)
  await page.evaluate(async () => {
    const modulePath = '/src/lib/realtime/socket.ts'
    const { getSocket } = await import(/* @vite-ignore */ modulePath)
    const events: OrderEvent[] = []
    ;(window as unknown as { __orderEvents: OrderEvent[] }).__orderEvents = events
    getSocket().on('order.updated', (update: OrderEvent) => events.push(update))
  })
}

function orderEvents(page: Page) {
  return page.evaluate(() => (window as unknown as { __orderEvents: OrderEvent[] }).__orderEvents)
}

async function payWithMetaMask(page: Page) {
  await page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/pedidos\/[\w-]+$/)
  return page.url().split('/').pop()!
}

test.describe('pedidos em tempo real', () => {
  test('order.updated chega pelo socket ao dono e confirma o pedido', async ({ page }) => {
    await login(page)
    await page.goto('/checkout')
    await recordOrderEvents(page)

    const orderId = await payWithMetaMask(page)
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible()
    await expect.poll(() => orderEvents(page)).toContainEqual(expect.objectContaining({ id: orderId, status: 'confirmed' }))
  })

  test('order.updated de outro usuário não chega à sessão atual', async ({ page }) => {
    await login(page, OTHER_USER)
    await recordOrderEvents(page)

    // The demo collector buys straight through the simulated API, outside the app session.
    const orderId = await page.evaluate(async (owner) => {
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
      const wallets = await fetch('/api/me/wallets', { headers }).then(json)
      const wallet = wallets.find((item: { role: string }) => item.role === 'primary')
      const cart = await fetch(`/api/cart?network=${wallet.networkId}`, { headers }).then(json)
      const quote = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers,
        body: JSON.stringify({ networkId: wallet.networkId, expectedTotalEth: cart.totalEth }),
      }).then(json)
      const order = await fetch('/api/orders', {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          quoteId: quote.id,
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
        }),
      }).then(json)
      ;(window as unknown as { __ownerToken: string }).__ownerToken = session.token
      return order.id as string
    }, DEMO_USER)

    // Once the owner sees it confirmed, the settlement event has already been emitted.
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const token = (window as unknown as { __ownerToken: string }).__ownerToken
          const response = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          return (await response.json()).status
        }, orderId),
      )
      .toBe('confirmed')
    expect(await orderEvents(page)).toEqual([])

    const ownOrder = await page.evaluate(async (id) => {
      const session = JSON.parse(localStorage.getItem('kurio.session')!)
      const response = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${session.token}` } })
      return response.status
    }, orderId)
    expect(ownOrder).toBe(404)
  })

  test('pagamento pendente é recuperado em outras páginas e após recarregar', async ({ page }) => {
    await login(page)
    await page.goto('/checkout')
    await enableScenario(page, 'payment-timeout')

    const orderId = await payWithMetaMask(page)
    await expect(page.getByText(/Aguardando a confirmação do pagamento/)).toBeVisible()

    await page.goto('/')
    const banner = page.getByRole('status').filter({ hasText: 'aguardando confirmação' })
    await expect(banner).toBeVisible()
    await page.reload()
    await expect(banner).toBeVisible()

    await banner.getByRole('link', { name: 'Acompanhar' }).click()
    await expect(page).toHaveURL(new RegExp(`/pedidos/${orderId}$`))
    await expect(page.getByText(/Aguardando a confirmação do pagamento/)).toBeVisible()
    await expect(banner).toHaveCount(0)
  })
})
