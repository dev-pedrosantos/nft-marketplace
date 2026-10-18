import type { Locator, Page } from '@playwright/test'
import { disableScenario, enableScenario, expect, login, test } from './support.ts'

// 1×1 transparent PNG.
const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

/** The field is flagged and its message is announced as the field's description. */
async function expectFieldError(field: Locator, message: string) {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toHaveAccessibleDescription(message)
}

function primaryWallet(page: Page) {
  return page.locator('#primary-wallet-form')
}

function secondaryWallet(page: Page) {
  return page.getByRole('region', { name: 'Carteira secundária' })
}

test.describe('perfil do colecionador', () => {
  test('valida os campos, mostra o conflito da API e persiste após recarregar', async ({ page }) => {
    await login(page)
    await page.goto('/conta/perfil')
    const save = page.getByRole('button', { name: 'Salvar', exact: true })

    await page.getByLabel('Nome de exibição').fill('')
    await page.getByLabel('Nome de usuário').fill('a b')
    await page.getByLabel('E-mail').fill('sem-arroba')
    await save.click()
    await expect(page.getByText('Revise os campos destacados.')).toBeVisible()
    await expectFieldError(page.getByLabel('Nome de exibição'), 'Campo obrigatório.')
    await expectFieldError(page.getByLabel('Nome de usuário'), 'Use de 3 a 30 letras, números, ponto, hífen ou sublinhado.')
    await expectFieldError(page.getByLabel('E-mail'), 'Informe um e-mail válido.')

    await page.getByLabel('Nome de exibição').fill('Nova S.')
    await page.getByLabel('Nome de usuário').fill('ana.lima')
    await page.getByLabel('E-mail').fill('colecionador@kurio.com')
    await save.click()
    await expectFieldError(page.getByLabel('Nome de usuário'), 'Este nome de usuário já está em uso.')

    await page.getByLabel('Nome de usuário').fill('nova.colecionadora')
    await save.click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await expect(page.getByLabel('Nome de usuário')).not.toHaveAttribute('aria-invalid', 'true')

    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nova S.')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('nova.colecionadora')
  })

  test('avatar recusa arquivo inválido, envia, persiste e pode ser removido', async ({ page }) => {
    await login(page)
    await page.goto('/conta/perfil')
    const file = page.locator('input[type="file"]')
    const avatar = page.getByRole('img', { name: 'Avatar de Nova Sato' })

    await file.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') })
    await expect(page.getByText('Envie uma imagem PNG, JPG ou WEBP.')).toBeVisible()

    await file.setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 1) })
    await expect(page.getByText('A imagem deve ter no máximo 1 MB.')).toBeVisible()
    await expect(avatar).toHaveCount(0)

    await file.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_PIXEL })
    await expect(avatar).toBeVisible()
    await expect(page.getByText('A imagem deve ter no máximo 1 MB.')).toHaveCount(0)

    await page.reload()
    await expect(avatar).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(avatar).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toBeVisible()
    await expect(avatar).toHaveCount(0)
  })
})

test.describe('carteiras', () => {
  test('carteira principal valida os campos, mostra falha da API e salva', async ({ page }) => {
    await login(page)
    await page.goto('/conta/carteiras')
    const form = primaryWallet(page)
    const address = form.getByLabel('Endereço da carteira')
    const save = form.getByRole('button', { name: 'Salvar carteira' })
    const newAddress = '0x1111222233334444555566667777888899990000'

    await address.fill('0x123')
    await form.getByLabel('Apelido da carteira').fill('')
    await form.getByLabel('E-mail').fill('invalido')
    await save.click()
    await expectFieldError(address, 'Informe um endereço 0x com 40 caracteres hexadecimais.')
    await expectFieldError(form.getByLabel('Apelido da carteira'), 'Campo obrigatório.')
    await expectFieldError(form.getByLabel('E-mail'), 'Informe um e-mail válido.')

    await address.fill(newAddress)
    await form.getByLabel('Apelido da carteira').fill('Cofre')
    await form.getByLabel('E-mail').fill('colecionador@kurio.com')
    await enableScenario(page, 'http-500')
    await save.click()
    await expect(form.getByText('Erro interno do servidor. Tente novamente em instantes.')).toBeVisible()
    await expect(address).toHaveValue(newAddress)

    await disableScenario(page, 'http-500')
    await save.click()
    await expect(form.getByText('Carteira principal salva.')).toBeVisible()

    await page.reload()
    await expect(primaryWallet(page).getByLabel('Endereço da carteira')).toHaveValue(newAddress)
    await expect(primaryWallet(page).getByLabel('Apelido da carteira')).toHaveValue('Cofre')
  })

  test('carteira secundária é editada com validação e persiste', async ({ page }) => {
    await login(page)
    await page.goto('/conta/carteiras')
    const section = secondaryWallet(page)
    await expect(section).toContainText('Reserva')

    await section.getByRole('button', { name: 'Editar' }).click()
    const nickname = section.getByLabel('Apelido da carteira')
    await nickname.fill('')
    await section.getByRole('button', { name: 'Salvar carteira' }).click()
    await expectFieldError(nickname, 'Campo obrigatório.')

    await nickname.fill('Cofre frio')
    await section.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(section.getByRole('button', { name: 'Salvar carteira' })).toHaveCount(0)
    await expect(section).toContainText('Cofre frio')

    await page.reload()
    await expect(secondaryWallet(page)).toContainText('Cofre frio')
  })

  test('a API valida a carteira mesmo sem passar pelo formulário', async ({ page }) => {
    await login(page)
    const response = await page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('kurio.session')!).token as string
      const result = await fetch('/api/me/wallets/wallet-demo-primary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: '0xabc', email: 'x' }),
      })
      return { status: result.status, body: await result.json() }
    })
    expect(response.status).toBe(422)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(response.body.fieldErrors).toMatchObject({
      address: 'Informe um endereço 0x com 40 caracteres hexadecimais.',
      email: 'Informe um e-mail válido.',
      nickname: 'Campo obrigatório.',
    })
  })
})
