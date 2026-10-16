import { authDialog, expect, test } from './support.ts'

test.describe('acessibilidade', () => {
  test('diálogo de login recebe o foco, mantém o teclado dentro e fecha com Escape', async ({ page }) => {
    await page.goto('/?auth=login')
    const dialog = authDialog(page)
    await expect(dialog).toBeVisible()
    await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).not.toHaveURL(/auth=login/)
  })

  test('controles mostram foco visível ao navegar pelo teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navegação por Tab é um cenário de teclado físico.')
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('button', { name: 'COMPRAR' })).toBeVisible()

    const buy = page.getByRole('button', { name: 'COMPRAR' })
    await buy.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(buy).toBeFocused()
    const outline = await buy.evaluate((node) => getComputedStyle(node).outlineStyle)
    expect(outline).not.toBe('none')
  })

  test('respeita prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?auth=login')
    await expect(authDialog(page)).toBeVisible()
    const duration = await authDialog(page).evaluate((node) => getComputedStyle(node).animationDuration)
    expect(parseFloat(duration)).toBeLessThan(0.001)
  })
})
