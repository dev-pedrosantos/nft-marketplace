import type { Page } from '@playwright/test'
import { expect, login, submitLogin, test } from './support.ts'

function footerColumn(page: Page, title: string) {
  return page.locator('footer').getByRole('navigation', { name: title })
}

const COLLECTIONS = [
  ['Arte digital', 'digital-art'],
  ['Fotografia', 'photography'],
  ['Música', 'music'],
  ['Arte 3D', '3d-art'],
  ['Utilidade', 'utility'],
] as const

test.describe('rodapé', () => {
  test('coleções filtram o catálogo da página inicial', async ({ page, isMobile }) => {
    await page.goto('/')
    const collections = footerColumn(page, 'Coleções')
    for (const [label, id] of COLLECTIONS) {
      await expect(collections.getByRole('link', { name: label })).toHaveAttribute('href', `/?collection=${id}#catalogo`)
    }

    await collections.getByRole('link', { name: 'Música' }).click()
    await expect(page).toHaveURL(/\/\?collection=music#catalogo$/)
    const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
    await expect(catalog).toBeInViewport()
    await expect(catalog.locator('a[href^="/nfts/"]').first()).toBeVisible()
    if (!isMobile) {
      await expect(page.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('links da conta pedem login e voltam ao destino', async ({ page }) => {
    await page.goto('/')
    await footerColumn(page, 'Meu perfil').getByRole('link', { name: 'Atividade' }).click()
    await expect(page).toHaveURL(/auth=login/)
    await expect(page).toHaveURL(/redirect=%2Fconta%2Fpedidos/)

    await submitLogin(page)
    await expect(page).toHaveURL(/\/conta\/pedidos$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Atividade' })).toBeVisible()
  })

  test('links da conta navegam com sessão ativa', async ({ page }) => {
    await login(page)
    const links = [
      ['Meu perfil', /\/conta\/perfil$/, 'Perfil do colecionador'],
      ['Atividade', /\/conta\/pedidos$/, 'Atividade'],
      ['Lista de interesse', /\/conta\/favoritos$/, 'Lista de interesse'],
    ] as const
    for (const [label, url, heading] of links) {
      await page.goto('/')
      await footerColumn(page, 'Meu perfil').getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })

  test('contato usa e-mail e telefone do design', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: 'contato@email.com' })).toHaveAttribute('href', 'mailto:contato@email.com')
    await expect(footer.getByRole('link', { name: '+55 11 4002 8922' })).toHaveAttribute('href', 'tel:+551140028922')
  })
})
