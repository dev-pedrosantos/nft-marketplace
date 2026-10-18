import type { Page } from '@playwright/test'
import { authDialog, expect, login, submitLogin, test } from './support.ts'

function summary(page: Page, isMobile: boolean) {
  return isMobile
    ? page.getByRole('region', { name: 'Resumo do pagamento' })
    : page.getByRole('complementary', { name: 'Resumo da carteira' })
}

function cartLines(page: Page) {
  return page.getByRole('list', { name: 'Itens do carrinho' }).filter({ visible: true }).getByRole('listitem')
}

test.describe('carrinho', () => {
  test('mostra os totais do servidor e aplica cupons', async ({ page, isMobile }) => {
    await login(page)
    await page.goto('/carrinho')
    const totals = summary(page, isMobile)
    await expect(cartLines(page)).toHaveCount(3)
    await expect(totals).toContainText('26.83 ETH')
    await expect(totals).toContainText('26.846 ETH')

    const code = totals.getByLabel('Código promocional')
    await code.fill('NAOEXISTE')
    await totals.getByRole('button', { name: 'Aplicar' }).click()
    await expect(totals.getByRole('alert')).toHaveText('Código promocional inválido.')

    await code.fill('EXPIRADO')
    await totals.getByRole('button', { name: 'Aplicar' }).click()
    await expect(totals.getByRole('alert')).toHaveText('Este código promocional expirou.')

    await code.fill('kurio10')
    await totals.getByRole('button', { name: 'Aplicar' }).click()
    await expect(totals).toContainText('2.683 ETH')
    await expect(totals).toContainText('24.163 ETH')

    await page.reload()
    await expect(summary(page, isMobile)).toContainText('24.163 ETH')
    await summary(page, isMobile).getByRole('button', { name: 'Remover' }).click()
    await expect(summary(page, isMobile)).toContainText('26.846 ETH')
  })

  test('altera quantidade, remove itens e persiste após recarregar', async ({ page, isMobile }) => {
    await login(page)
    await page.goto('/carrinho')
    const lines = cartLines(page)
    await expect(lines).toHaveCount(3)

    await lines
      .filter({ hasText: 'Emerald Ape #042' })
      .getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' })
      .click()
    await expect(summary(page, isMobile)).toContainText('25.656 ETH')

    await lines.filter({ hasText: 'Ivory Baron #088' }).getByRole('button', { name: 'Remover Ivory Baron #088 do carrinho' }).click()
    await expect(lines).toHaveCount(2)
    await expect(summary(page, isMobile)).toContainText('9.546 ETH')

    await page.reload()
    await expect(cartLines(page)).toHaveCount(2)
    await expect(summary(page, isMobile)).toContainText('9.546 ETH')
  })

  test('carrinho de visitante é mantido no login e segue para o checkout', async ({ page, isMobile }) => {
    await page.goto('/nfts/golden-signal-160')
    await page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR', exact: true }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(cartLines(page)).toHaveCount(1)

    await summary(page, isMobile).getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(authDialog(page)).toBeVisible()
    await submitLogin(page)

    await expect(page).toHaveURL(/\/checkout$/)
    // Seeded cart (26.83) + guest line (0.39) + network fee (0.016).
    await expect(page.getByText('27.236 ETH').filter({ visible: true }).first()).toBeVisible()
    if (!isMobile) await expect(page.getByText('Golden Signal #160').first()).toBeVisible()
  })

  test('carrinho vazio oferece voltar ao catálogo', async ({ page }) => {
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })
})
