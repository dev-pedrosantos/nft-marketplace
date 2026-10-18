import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect, login, test } from './support.ts'

const SCREENS = [
  { name: 'inicio', path: '/', signedIn: false },
  { name: 'detalhe', path: '/nfts/emerald-ape-042', signedIn: false },
  { name: 'carrinho', path: '/carrinho', signedIn: true },
  { name: 'pagamento', path: '/checkout', signedIn: true },
] as const

/** Lazy images below the fold would otherwise be missing from a full-page capture. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager'
    await Promise.all(
      [...document.images].map((image) =>
        image.complete ? undefined : new Promise((resolve) => image.addEventListener('load', resolve, { once: true })),
      ),
    )
    await document.fonts.ready
  })
  await expect(page.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0)
}

test.describe('regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00-03:00'))
  })

  for (const screen of SCREENS) {
    test(screen.name, async ({ page }) => {
      if (screen.signedIn) await login(page)
      await page.goto(screen.path)
      await settle(page)
      await expect(page).toHaveScreenshot(`${screen.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        stylePath: path.join(import.meta.dirname, 'visual.css'),
      })
    })
  }
})
