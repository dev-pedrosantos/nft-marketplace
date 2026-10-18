import type { Page } from '@playwright/test'
import {
  connectWallet,
  enableScenario,
  expect,
  login,
  OTHER_USER,
  postOrder,
  prepareApiPurchase,
  test,
  waitForRealtime,
} from './support.ts'

interface OrderEvent {
  eventId: string
  id: string
  status: string
  version: number
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
  await connectWallet(page, 'MetaMask')
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
    await expect
      .poll(() => orderEvents(page))
      .toEqual([
        expect.objectContaining({ id: orderId, status: 'pending', version: 1 }),
        expect.objectContaining({ id: orderId, status: 'confirmed', version: 2 }),
      ])
  })

  test('evento atrasado ou repetido não tira o pedido do status final', async ({ page }) => {
    await login(page)
    await page.goto('/checkout')
    await recordOrderEvents(page)

    const orderId = await payWithMetaMask(page)
    const receipt = page.getByRole('dialog', { name: 'Compra confirmada' })
    await expect(receipt).toBeVisible()
    await expect.poll(async () => (await orderEvents(page)).length).toBe(2)
    const [pending, confirmed] = await orderEvents(page)
    await expect(page.getByText('Confirmado', { exact: true })).toBeVisible()
    // Records whether the page shows the order as pending again at any moment.
    await page.evaluate(() => {
      const state = window as unknown as { __sawPending: boolean }
      state.__sawPending = false
      new MutationObserver(() => {
        if (document.body.innerText.includes('Pagamento pendente')) state.__sawPending = true
      }).observe(document.body, { subtree: true, childList: true, characterData: true })
    })

    // The "pending" event arrives again after the confirmation, then the confirmation repeats.
    expect(await page.evaluate((id) => window.__kurioMock!.redeliverEvent(id), pending.eventId)).toBe(true)
    expect(await page.evaluate((id) => window.__kurioMock!.redeliverEvent(id), confirmed.eventId)).toBe(true)
    await expect.poll(async () => (await orderEvents(page)).length).toBe(4)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => (window as unknown as { __sawPending: boolean }).__sawPending)).toBe(false)

    await expect(receipt).toBeVisible()
    await receipt.getByRole('button', { name: 'Fechar comprovante' }).click()
    await expect(page).toHaveURL(/\/conta\/pedidos/)
    await page.goto(`/pedidos/${orderId}`)
    await expect(page.getByText('Confirmado', { exact: true })).toBeVisible()
  })

  test('order.updated de outro usuário não chega à sessão atual', async ({ page }) => {
    await login(page, OTHER_USER)
    await recordOrderEvents(page)

    // The demo collector buys straight through the simulated API, outside the app session.
    const purchase = await prepareApiPurchase(page)
    const order = await postOrder(page, purchase, crypto.randomUUID())
    expect(order.status).toBe(201)
    const orderId = order.body.id as string

    // Once the owner sees it confirmed, the settlement event has already been emitted.
    await expect
      .poll(() =>
        page.evaluate(
          async ({ id, token }) => {
            const response = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            return (await response.json()).status
          },
          { id: orderId, token: purchase.token },
        ),
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
