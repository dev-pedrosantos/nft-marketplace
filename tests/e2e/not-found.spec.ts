import { expect, test } from './support.ts'

test.describe('página não encontrada', () => {
  test('endereço desconhecido mostra o aviso e volta ao início', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Erro 404' })).toBeAttached()
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await expect(page.locator('[aria-current="page"]')).toHaveCount(0)

    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Página não encontrada')).toHaveCount(0)
  })

  test('subrota desconhecida de uma rota existente também cai no aviso', async ({ page }) => {
    await page.goto('/conta/rota-que-nao-existe')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
  })
})
