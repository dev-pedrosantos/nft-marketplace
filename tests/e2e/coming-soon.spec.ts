import type { Locator, Page } from '@playwright/test'
import { expect, test } from './support.ts'

const FOOTER_ITEMS = [
  ['Meu perfil', 'Minha coleção'],
  ['Meu perfil', 'Estúdio do criador'],
  ['Central de ajuda', 'Central de ajuda'],
  ['Central de ajuda', 'Como comprar NFTs'],
  ['Central de ajuda', 'Carteira e segurança'],
  ['Central de ajuda', 'Política do mercado'],
  ['Central de ajuda', 'Denunciar item'],
] as const

function footerColumn(page: Page, title: string) {
  return page.locator('footer').getByRole('navigation', { name: title })
}

function comingSoon(page: Page) {
  return page.getByRole('dialog', { name: 'Em breve' })
}

async function expectComingSoon(page: Page, trigger: Locator, feature: string) {
  await trigger.click()
  const dialog = comingSoon(page)
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(`${feature} ainda não está disponível`)
  return dialog
}

test.describe('itens sem destino', () => {
  test('rodapé abre o aviso no clique e mantém a página', async ({ page }) => {
    await page.goto('/')
    await expect(footerColumn(page, 'Meu perfil').getByRole('link')).toHaveCount(3)
    await expect(footerColumn(page, 'Central de ajuda').getByRole('link')).toHaveCount(0)
    await expect(page.locator('footer a[href="#"]')).toHaveCount(0)

    for (const [column, label] of FOOTER_ITEMS) {
      const trigger = footerColumn(page, column).getByRole('button', { name: label, exact: true })
      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
      const dialog = await expectComingSoon(page, trigger, label)
      await dialog.getByRole('button', { name: 'Entendi' }).click()
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
    }
    await expect(page).toHaveURL(/\/$/)
  })

  test('aviso fecha pelo X, por Esc e clicando fora', async ({ page, isMobile }) => {
    await page.goto('/')
    const trigger = footerColumn(page, 'Central de ajuda').getByRole('button', { name: 'Como comprar NFTs' })

    let dialog = await expectComingSoon(page, trigger, 'Como comprar NFTs')
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(dialog).toBeHidden()

    dialog = await expectComingSoon(page, trigger, 'Como comprar NFTs')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    dialog = await expectComingSoon(page, trigger, 'Como comprar NFTs')
    if (isMobile) await page.touchscreen.tap(8, 8)
    else await page.mouse.click(8, 8)
    await expect(dialog).toBeHidden()
  })

  test('aviso fica centralizado e dentro da tela', async ({ page }) => {
    await page.goto('/')
    const trigger = footerColumn(page, 'Meu perfil').getByRole('button', { name: 'Estúdio do criador' })
    const dialog = await expectComingSoon(page, trigger, 'Estúdio do criador')
    await expect(dialog).toBeInViewport({ ratio: 1 })

    const viewport = page.viewportSize()!
    const box = (await dialog.boundingBox())!
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2)
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2)
  })

  test('passar o mouse não abre o aviso', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Hover só existe com ponteiro.')
    await page.goto('/')
    await footerColumn(page, 'Meu perfil').getByRole('button', { name: 'Minha coleção' }).hover()
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Criadores' }).hover()
    await page.waitForTimeout(300)
    await expect(comingSoon(page)).toHaveCount(0)
  })

  test('header abre o aviso em Criadores e Aprenda e mantém os links', async ({ page, isMobile }) => {
    test.skip(isMobile, 'O header só aparece a partir de 768 px, como no Figma.')
    await page.goto('/carrinho')
    const nav = page.getByRole('navigation', { name: 'Principal' })

    for (const label of ['Criadores', 'Aprenda']) {
      const dialog = await expectComingSoon(page, nav.getByRole('button', { name: label }), label)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    }
    await expect(page).toHaveURL(/\/carrinho$/)

    await nav.getByRole('link', { name: 'Mercado' }).click()
    await expect(page).toHaveURL(/\/#catalogo$/)
    await expect(comingSoon(page)).toHaveCount(0)
  })
})
