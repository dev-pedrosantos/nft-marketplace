import { authDialog, DEMO_USER, expect, login, OTHER_USER, submitLogin, test, waitForMocks } from './support.ts'

test.describe('autenticação e sessão', () => {
  test('valida o formulário e recusa credenciais erradas', async ({ page }) => {
    await page.goto('/?auth=login')
    const dialog = authDialog(page)

    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByText('Campo obrigatório.').first()).toBeVisible()

    await dialog.getByLabel('E-mail').fill(DEMO_USER.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText(/e-mail ou senha/i)
  })

  test('mantém a sessão após recarregar e encerra no logout', async ({ page }) => {
    await login(page)
    await page.reload()
    await page.goto('/conta/perfil')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(DEMO_USER.name)

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/($|\?)/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio.session'))).toBeNull()
    await page.goto('/conta/perfil')
    await expect(authDialog(page)).toBeVisible()
  })

  test('rota privada pede login e volta para a página pedida', async ({ page }) => {
    await page.goto('/conta/carteiras')
    await expect(page).toHaveURL(/auth=login/)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/conta\/carteiras$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('sessão expirada encerra o acesso e pede novo login', async ({ page }) => {
    await login(page)
    await page.goto('/conta/perfil')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(DEMO_USER.name)

    await page.evaluate(() => window.__kurioMock!.expireSessions())
    await page.goto('/conta/pedidos')
    await expect(authDialog(page).getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()

    await submitLogin(page)
    await expect(page).toHaveURL(/\/conta\/pedidos/)
  })

  test('cadastro valida campos e cria a conta', async ({ page }) => {
    await page.goto('/?auth=signup')
    const dialog = authDialog(page)
    await dialog.getByLabel('Nome de usuário').fill('nova.colecionadora')
    await dialog.getByLabel('E-mail').fill('nova@kurio.com')
    await dialog.getByLabel('Senha', { exact: true }).fill('segredo123')
    await dialog.getByLabel('Confirmar senha').fill('outra-senha')
    await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).click()
    await expect(dialog.getByText('As senhas não coincidem.')).toBeVisible()

    await dialog.getByLabel('Confirmar senha').fill('segredo123')
    await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).click()
    await expect(dialog).toBeHidden()
    await page.goto('/conta/perfil')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('nova.colecionadora')
  })

  test('cadastro com e-mail ou usuário já existentes mostra o conflito nos campos', async ({ page }) => {
    await page.goto('/?auth=signup')
    const dialog = authDialog(page)
    await dialog.getByLabel('Nome de usuário').fill('nova.sato')
    await dialog.getByLabel('E-mail').fill(DEMO_USER.email.toUpperCase())
    await dialog.getByLabel('Senha', { exact: true }).fill('segredo123')
    await dialog.getByLabel('Confirmar senha').fill('segredo123')
    await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).click()

    await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription('Já existe uma conta com este e-mail.')
    await expect(dialog.getByLabel('Nome de usuário')).toHaveAccessibleDescription('Este nome de usuário já está em uso.')
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio.session'))).toBeNull()

    await dialog.getByLabel('Nome de usuário').fill('outra.pessoa')
    await dialog.getByLabel('E-mail').fill('outra@kurio.com')
    await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).click()
    await expect(dialog).toBeHidden()
  })

  test('troca de senha confere a atual e só aceita a nova no login', async ({ page }) => {
    const newPassword = 'nova-senha-456'
    await login(page)
    await page.goto('/conta/perfil')

    await page.getByLabel('Senha atual').fill('senha-errada')
    await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
    await page.getByLabel('Confirmar nova senha').fill(newPassword)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await page.getByLabel('Senha atual').fill(DEMO_USER.password)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil e senha atualizados.')).toBeVisible()

    const stored = await page.evaluate(() => localStorage.getItem('kurio.mock-db') ?? '')
    expect(stored).toContain('pbkdf2-sha256$')
    expect(stored).not.toContain(newPassword)
    expect(stored).not.toContain(DEMO_USER.password)

    await page.getByRole('button', { name: 'Sair' }).click()
    await page.goto('/?auth=login')
    const dialog = authDialog(page)
    await dialog.getByLabel('E-mail').fill(DEMO_USER.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(DEMO_USER.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText(/e-mail ou senha/i)

    await submitLogin(page, { email: DEMO_USER.email, password: newPassword })
  })

  test('dados de um usuário não aparecem para outro', async ({ page }) => {
    await login(page)
    await page.goto('/carrinho')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' }).first()).toContainText('Emerald Ape #042')

    await page.evaluate(() => localStorage.removeItem('kurio.session'))
    await waitForMocks(page)
    await login(page, OTHER_USER)
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await page.goto('/conta/carteiras')
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
    const leaked = await page.$$eval('input', (inputs) =>
      inputs.some((input) => (input as HTMLInputElement).value.startsWith('0xa91f')),
    )
    expect(leaked).toBe(false)
  })
})
