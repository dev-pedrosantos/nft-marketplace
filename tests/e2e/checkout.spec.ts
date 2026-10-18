import type { Page } from '@playwright/test'
import {
  authDialog,
  connectWallet,
  disableScenario,
  enableScenario,
  expect,
  login,
  postOrder,
  prepareApiPurchase,
  submitLogin,
  test,
  waitForRealtime,
} from './support.ts'

function orderCount(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('kurio.mock-db')
    return raw ? (JSON.parse(raw) as { orders: unknown[] }).orders.length : 0
  })
}

async function openCheckout(page: Page) {
  await login(page)
  await page.goto('/checkout')
  await expect(page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true })).toBeVisible()
}

function submitButton(page: Page) {
  return page.getByRole('button', { name: /^(Confirmar compra|Processando…)$/ }).filter({ visible: true })
}

test.describe('checkout', () => {
  test('exige carteira de pagamento e conclui a compra com clique duplo sem duplicar', async ({ page }) => {
    await openCheckout(page)

    await submitButton(page).click()
    await expect(page.getByText('Selecione uma carteira para pagar.').filter({ visible: true })).toBeVisible()

    await connectWallet(page, 'MetaMask')
    await submitButton(page).dblclick()

    await expect(page).toHaveURL(/\/pedidos\/[\w-]+$/)
    const receipt = page.getByRole('dialog', { name: 'Compra confirmada' })
    await expect(receipt).toBeVisible({ timeout: 10_000 })
    await expect(receipt).toContainText('MetaMask')
    expect(await orderCount(page)).toBe(1)

    await receipt.getByRole('button', { name: 'Fechar' }).click()
    await expect(page).toHaveURL(/\/conta\/pedidos/)

    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('pagamento recusado não mostra confirmação e mantém o carrinho', async ({ page }) => {
    await openCheckout(page)
    await enableScenario(page, 'payment-failure')

    await connectWallet(page, 'MetaMask')
    await submitButton(page).click()

    await expect(page).toHaveURL(/\/pedidos\//)
    await expect(page.getByText('Pagamento não concluído.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toHaveCount(0)

    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' }).filter({ visible: true }).getByRole('listitem')).toHaveCount(3)
  })

  test('mudança de preço pede revisão antes de cobrar', async ({ page }) => {
    await openCheckout(page)
    await enableScenario(page, 'price-change')

    await connectWallet(page, 'Coinbase Wallet')
    await submitButton(page).click()

    const review = page.getByRole('dialog', { name: 'Os valores mudaram' })
    await expect(review).toBeVisible()
    await expect(review).toContainText('Emerald Ape #042: O preço mudou de 1.19 ETH para 1.24 ETH.')
    expect(await orderCount(page)).toBe(0)

    await review.getByRole('button', { name: 'Confirmar novo total' }).click()
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible({ timeout: 10_000 })
    expect(await orderCount(page)).toBe(1)
  })

  test('preço alterado pelo socket no checkout exige nova revisão e recusa a cotação antiga', async ({ page }) => {
    await openCheckout(page)
    await waitForRealtime(page)
    await connectWallet(page, 'MetaMask')
    const setPrice = (price: string) =>
      page.evaluate((value) => window.__kurioMock!.setPrice('emerald-ape-042', value), price)

    await setPrice('1.30')
    await expect(page.getByText('Alguns itens mudaram de preço ou disponibilidade.').filter({ visible: true })).toBeVisible()

    await submitButton(page).click()
    const review = page.getByRole('dialog', { name: 'Os valores mudaram' })
    await expect(review).toContainText('Emerald Ape #042: O preço mudou de 1.19 ETH para 1.30 ETH.')
    expect(await orderCount(page)).toBe(0)

    // The price moves again while the review is open: that quote can no longer be charged.
    await setPrice('1.45')
    await review.getByRole('button', { name: 'Confirmar novo total' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'mudou depois da revisão' }).filter({ visible: true })).toBeVisible()
    expect(await orderCount(page)).toBe(0)

    await submitButton(page).click()
    await expect(review).toContainText('Emerald Ape #042: O preço mudou de 1.30 ETH para 1.45 ETH.')
    await review.getByRole('button', { name: 'Confirmar novo total' }).click()
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible({ timeout: 10_000 })
    const charged = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('kurio.mock-db')!) as { orders: { items: { nftId: string; unitPriceEth: string }[] }[] }
      return db.orders.map((order) => order.items.find((item) => item.nftId === 'emerald-ape-042')?.unitPriceEth)
    })
    expect(charged).toEqual(['1.45'])
  })

  test('sessão expirada no checkout pede login e retoma a compra com os dados preenchidos', async ({ page, isMobile }) => {
    await openCheckout(page)
    // Desktop shows the collector form; the mobile frame only picks one of the saved wallets.
    const filled = isMobile
      ? page.getByRole('radio', { name: /^Reserva/ })
      : page.getByLabel('Nome de exibição').filter({ visible: true })
    if (isMobile) await filled.click()
    else await filled.fill('Nova Sato (presente)')
    await connectWallet(page, 'MetaMask')

    await page.evaluate(() => window.__kurioMock!.expireSessions())
    await submitButton(page).click()
    const dialog = authDialog(page)
    await expect(dialog.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()
    expect(await orderCount(page)).toBe(0)

    await submitLogin(page)
    await expect(page).toHaveURL(/\/checkout$/)
    if (isMobile) await expect(filled).toHaveAttribute('aria-checked', 'true')
    else await expect(filled).toHaveValue('Nova Sato (presente)')

    await connectWallet(page, 'MetaMask')
    await submitButton(page).click()
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible({ timeout: 10_000 })
    expect(await orderCount(page)).toBe(1)
    const collector = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('kurio.mock-db')!) as { orders: { walletAddress: string }[] }
      return db.orders[0].walletAddress
    })
    expect(collector).toBe(isMobile ? '0x5c3e9a1b7d2f4e6a8c0b1d3f5a7c9e1b3d5f7a90' : '0xa91f4b7c2d9e0f13a5b6c7d8e9f0a1b2c3d4e82c')
    expect(await page.evaluate(() => sessionStorage.getItem('kurio.checkout.draft'))).toBeNull()
  })

  test('logout descarta o rascunho do checkout', async ({ page }) => {
    await openCheckout(page)
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('kurio.checkout.draft'))).toContain('user-demo')
    await page.goto('/conta/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('kurio.checkout.draft'))).toBeNull()
  })

  test('timeout permite tentar de novo com a mesma chave de idempotência', async ({ page }) => {
    test.setTimeout(60_000)
    await openCheckout(page)
    await enableScenario(page, 'slow-order')

    await connectWallet(page, 'MetaMask')
    await submitButton(page).click()

    await expect(page.getByRole('alert').filter({ hasText: 'O servidor demorou demais para responder.' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page).toHaveURL(/\/checkout$/)
    // The server kept processing the order, which already settled and left the cart.
    await expect.poll(() => orderCount(page)).toBe(1)
    await expect(page.getByText('Sua compra anterior ainda não foi confirmada')).toBeVisible()

    await disableScenario(page, 'slow-order')
    await page.reload()
    await page.getByRole('button', { name: 'Verificar compra' }).click()

    await expect(page).toHaveURL(/\/pedidos\//)
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible({ timeout: 10_000 })
    expect(await orderCount(page)).toBe(1)
  })

  test('falha temporária do serviço mostra erro com nova tentativa', async ({ page }) => {
    await openCheckout(page)
    await enableScenario(page, 'server-error')

    await connectWallet(page, 'MetaMask')
    await submitButton(page).click()
    const alert = page.getByRole('alert').filter({ hasText: 'Serviço de pagamento indisponível' })
    await expect(alert).toBeVisible()
    expect(await orderCount(page)).toBe(0)

    await disableScenario(page, 'server-error')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible({ timeout: 10_000 })
    expect(await orderCount(page)).toBe(1)
  })
})

test.describe('conexão da carteira', () => {
  test('recusa bloqueia o pagamento; nova tentativa conecta, persiste e pode ser desfeita', async ({ page }) => {
    await openCheckout(page)
    await enableScenario(page, 'wallet-rejected')

    const metaMask = page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true })
    await metaMask.click()
    const refusal = page
      .getByRole('alert')
      .filter({ hasText: 'A conexão foi recusada na carteira MetaMask.' })
      .filter({ visible: true })
    await expect(refusal).toBeVisible()

    await submitButton(page).click()
    await expect(page.getByText('Conecte a carteira MetaMask para pagar.').filter({ visible: true })).toBeVisible()
    expect(await orderCount(page)).toBe(0)

    await disableScenario(page, 'wallet-rejected')
    await refusal.getByRole('button', { name: 'Conectar de novo' }).click()
    const connected = page.getByText('MetaMask conectada').filter({ visible: true })
    await expect(connected).toBeVisible()
    // The wallet exposes the collector's primary account.
    await expect(page.getByText('· 0xA91F…E82C').filter({ visible: true })).toBeVisible()

    await page.reload()
    await expect(metaMask).toHaveAttribute('aria-checked', 'true')
    await expect(connected).toBeVisible()

    await page.getByRole('button', { name: 'Desconectar' }).filter({ visible: true }).click()
    await expect(connected).toBeHidden()
    await expect(metaMask).toHaveAttribute('aria-checked', 'false')
    await submitButton(page).click()
    await expect(page.getByText('Selecione uma carteira para pagar.').filter({ visible: true })).toBeVisible()

    await page.reload()
    await expect(metaMask).toHaveAttribute('aria-checked', 'false')
    expect(await orderCount(page)).toBe(0)
  })

  test('trocar de provedor conecta a nova carteira', async ({ page }) => {
    await openCheckout(page)
    await connectWallet(page, 'MetaMask')
    await connectWallet(page, 'WalletConnect')
    await expect(page.getByText('MetaMask conectada').filter({ visible: true })).toBeHidden()
    await expect(page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })
})

test.describe('idempotência na API', () => {
  test('pedido sem carteira conectada é recusado', async ({ page }) => {
    await page.goto('/')
    const purchase = await prepareApiPurchase(page, { connect: false })
    const response = await postOrder(page, purchase, crypto.randomUUID())
    expect(response.status).toBe(409)
    expect(response.body.code).toBe('WALLET_NOT_CONNECTED')
    expect(await orderCount(page)).toBe(0)
  })

  test('a mesma chave devolve o mesmo pedido; com outro conteúdo responde 409', async ({ page }) => {
    await page.goto('/')
    const purchase = await prepareApiPurchase(page)
    const key = crypto.randomUUID()

    const first = await postOrder(page, purchase, key)
    expect(first.status).toBe(201)

    const retry = await postOrder(page, purchase, key)
    expect(retry.status).toBe(200)
    expect(retry.body.id).toBe(first.body.id)

    const changed = { ...purchase, body: { ...purchase.body, collector: { ...purchase.body.collector, note: 'outro' } } }
    const conflict = await postOrder(page, changed, key)
    expect(conflict.status).toBe(409)
    expect(conflict.body.code).toBe('IDEMPOTENCY_KEY_REUSED')

    expect(await orderCount(page)).toBe(1)
  })

  test('requisições simultâneas com a mesma chave criam um único pedido', async ({ page }) => {
    await page.goto('/')
    const purchase = await prepareApiPurchase(page)
    const key = crypto.randomUUID()

    // Both requests leave the page together, like a double submit racing a retry.
    const [a, b] = await page.evaluate(
      ({ purchase, key }) => {
        const send = () =>
          fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${purchase.token}`,
              'Idempotency-Key': key,
            },
            body: JSON.stringify(purchase.body),
          }).then(async (response) => ({ status: response.status, body: await response.json() }))
        return Promise.all([send(), send()])
      },
      { purchase, key },
    )
    expect([a.status, b.status].sort()).toEqual([200, 201])
    expect(a.body.id).toBe(b.body.id)
    expect(await orderCount(page)).toBe(1)
  })
})
