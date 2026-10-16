import type { Page } from '@playwright/test'
import { expect, test } from './support.ts'

function catalog(page: Page) {
  return page.getByRole('region', { name: 'Catálogo de NFTs' })
}

function cards(page: Page) {
  return catalog(page)
    .getByRole('listitem')
    .filter({ has: page.locator('a[href^="/nfts/"]') })
}

async function search(page: Page, term: string, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill(term)
    return
  }
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const field = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  await field.fill(term)
  await field.press('Enter')
}

test.describe('catálogo', () => {
  test('busca por nome e mostra o estado vazio', async ({ page, isMobile }) => {
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible()

    await search(page, 'nomad', isMobile)
    await expect(page).toHaveURL(/q=nomad/)
    await expect(cards(page).first()).toBeVisible()
    for (const card of await cards(page).all()) {
      await expect(card).toContainText(/nomad/i)
    }

    await page.goto('/?q=inexistente-xyz')
    await expect(catalog(page).getByText('Nenhum NFT encontrado.')).toBeVisible()
  })

  test('ordena por preço e pagina os resultados', async ({ page, isMobile }) => {
    test.skip(isMobile, 'A ordenação só aparece a partir de 768 px, como no Figma.')
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible()

    await catalog(page).getByLabel('Ordenar por').selectOption('price-asc')
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(async () => {
      const prices = (await cards(page).allInnerTexts()).map((text) => Number(/(\d+\.\d+) ETH/.exec(text)?.[1]))
      expect(prices.every(Number.isFinite)).toBe(true)
      expect(prices).toEqual([...prices].sort((a, b) => a - b))
    }).toPass()

    const pagination = page.getByRole('navigation', { name: 'Paginação' })
    const firstPage = await cards(page).allInnerTexts()
    await pagination.getByRole('button', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(pagination.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => cards(page).allInnerTexts()).not.toEqual(firstPage)
  })

  test('abas filtram a listagem pela URL', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
    await expect(cards(page).first()).toBeVisible()

    await page.reload()
    await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
  })
})
