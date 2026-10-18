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

  test('filtros combinados reiniciam a paginação e voltam pelo histórico', async ({ page, isMobile }) => {
    test.skip(isMobile, 'A coluna de filtros só aparece a partir de 1024 px.')
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible()
    const filters = catalog(page).locator('aside')
    const pagination = page.getByRole('navigation', { name: 'Paginação' })
    const currentPage = (number: number) =>
      expect(pagination.getByRole('button', { name: `Página ${number}` })).toHaveAttribute('aria-current', 'page')
    const lastListRequest = () =>
      page.waitForRequest((request) => new URL(request.url()).pathname === '/api/nfts')
    /** Names the simulated API returns for the same filters, to compare with the grid. */
    const expectedNames = (query: string) =>
      page.evaluate(
        (search) => fetch(`/api/nfts?${search}`).then((response) => response.json()).then((data) => data.items.map((item: { name: string }) => item.name)),
        query,
      )
    const shownNames = () => cards(page).locator('h3').allInnerTexts()

    await filters.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/collection=music/)
    await pagination.getByRole('button', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/page=2/)
    await currentPage(2)

    let request = lastListRequest()
    await filters.getByRole('button', { name: /^Polygon/ }).click()
    let params = new URL((await request).url()).searchParams
    expect(params.get('collection')).toBe('music')
    expect(params.get('network')).toBe('polygon')
    expect(params.get('page')).toBe('1')
    await expect(page).not.toHaveURL(/page=/)
    await currentPage(1)

    request = lastListRequest()
    await filters.getByLabel('Preço máximo').fill('5')
    await filters.getByRole('button', { name: 'Aplicar' }).click()
    params = new URL((await request).url()).searchParams
    expect([params.get('collection'), params.get('network'), params.get('maxPrice')]).toEqual(['music', 'polygon', '5'])
    await expect(page).toHaveURL(/collection=music.*network=polygon.*maxPrice=5|maxPrice=5.*network=polygon/)

    const combined = await expectedNames('collection=music&network=polygon&maxPrice=5&page=1')
    expect(combined.length).toBeGreaterThan(0)
    await expect.poll(shownNames).toEqual(combined)
    for (const text of await cards(page).allInnerTexts()) {
      expect(Number(/(\d+\.\d+) ETH/.exec(text)?.[1])).toBeLessThanOrEqual(5)
    }

    await page.reload()
    await expect(filters.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(filters.getByRole('button', { name: /^Polygon/ })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(shownNames).toEqual(combined)

    await page.goBack()
    await expect(page).not.toHaveURL(/maxPrice/)
    await expect(page).toHaveURL(/network=polygon/)
    await expect.poll(shownNames).toEqual(await expectedNames('collection=music&network=polygon&page=1'))

    await page.goBack()
    await expect(page).not.toHaveURL(/network/)
    await expect(filters.getByRole('button', { name: /^Polygon/ })).toHaveAttribute('aria-pressed', 'false')
    await currentPage(2)
    await expect.poll(shownNames).toEqual(await expectedNames('collection=music&page=2'))

    await page.goForward()
    await expect(page).toHaveURL(/network=polygon/)
    await currentPage(1)
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
