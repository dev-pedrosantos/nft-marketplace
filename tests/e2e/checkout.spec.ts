import type { Page } from '@playwright/test'
import { disableScenario, enableScenario, expect, login, test } from './support.ts'

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

    await page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true }).click()
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

    await page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true }).click()
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

    await page.getByRole('radio', { name: 'Coinbase Wallet', exact: true }).filter({ visible: true }).click()
    await submitButton(page).click()

    const review = page.getByRole('dialog', { name: 'Os valores mudaram' })
    await expect(review).toBeVisible()
    await expect(review).toContainText('Emerald Ape #042: O preço mudou de 1.19 ETH para 1.24 ETH.')
    expect(await orderCount(page)).toBe(0)

    await review.getByRole('button', { name: 'Confirmar novo total' }).click()
    await expect(page.getByRole('dialog', { name: 'Compra confirmada' })).toBeVisible({ timeout: 10_000 })
    expect(await orderCount(page)).toBe(1)
  })

  test('timeout permite tentar de novo com a mesma chave de idempotência', async ({ page }) => {
    test.setTimeout(60_000)
    await openCheckout(page)
    await enableScenario(page, 'slow-order')

    await page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true }).click()
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

    await page.getByRole('radio', { name: 'MetaMask', exact: true }).filter({ visible: true }).click()
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
