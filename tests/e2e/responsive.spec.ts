import type { Page } from '@playwright/test'
import { expect, login, test } from './support.ts'

// 320 px is the WCAG reflow width (1280 px at 400% zoom); the others are the challenge's breakpoints.
const WIDTHS = [320, 390, 768, 1440]

const PUBLIC_ROUTES = ['/', '/nfts/emerald-ape-042', '/carrinho', '/rota-que-nao-existe']
const PRIVATE_ROUTES = ['/checkout', '/conta/perfil', '/conta/carteiras', '/conta/favoritos', '/conta/pedidos']

/** Elements wider than the viewport, which force a horizontal scroll. */
function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement
    if (root.scrollWidth <= root.clientWidth) return []
    return Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 1)
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`.slice(0, 120))
  })
}

async function checkRoutes(page: Page, routes: string[]) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' })
      await expect(page.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0)
      expect.soft(await horizontalOverflow(page), `${route} em ${width}px`).toEqual([])
    }
  }
}

test.describe('responsividade', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'As larguras são definidas no próprio teste; basta um projeto.')
    test.setTimeout(120_000)
  })

  test('telas públicas não rolam na horizontal de 320 a 1440 px', async ({ page }) => {
    await checkRoutes(page, PUBLIC_ROUTES)
  })

  test('telas da conta e do pagamento não rolam na horizontal de 320 a 1440 px', async ({ page }) => {
    await login(page)
    await checkRoutes(page, PRIVATE_ROUTES)
  })
})
