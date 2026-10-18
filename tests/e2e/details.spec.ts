import {
  authDialog,
  disableScenario,
  enableScenario,
  expect,
  login,
  submitLogin,
  test,
  waitForRealtime,
} from './support.ts'

const NFT = 'Emerald Ape #042'

test.describe('detalhes do NFT', () => {
  test('escolhe edição e quantidade e envia ao carrinho', async ({ page, isMobile }) => {
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: NFT }).first()).toBeVisible()

    const editions = page.getByRole('radiogroup', { name: 'Edição' }).filter({ visible: true })
    await expect(editions.getByRole('radio', { name: '1/50', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(editions.getByRole('radio', { name: '1/1', exact: true })).toBeEnabled()

    await editions.getByRole('radio', { name: '1/10', exact: true }).click()
    await expect(editions.getByRole('radio', { name: '1/10', exact: true })).toHaveAttribute('aria-checked', 'true')

    const stepper = page.getByRole('group', { name: `Quantidade de ${NFT}` }).filter({ visible: true })
    const increase = stepper.getByRole('button', { name: `Aumentar quantidade de ${NFT}` })
    for (let i = 0; i < 5; i++) {
      if (await increase.isEnabled()) await increase.click()
    }
    // Edition 1/10 has 4 copies left in the seed, so the stepper stops there.
    await expect(stepper.locator('output')).toHaveText('4')
    await expect(increase).toBeDisabled()
    await stepper.getByRole('button', { name: `Diminuir quantidade de ${NFT}` }).click()
    await expect(stepper.locator('output')).toHaveText('3')

    await page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR', exact: true }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    const line = page.getByRole('list', { name: 'Itens do carrinho' }).filter({ visible: true }).getByRole('listitem')
    await expect(line).toHaveCount(1)
    await expect(line).toContainText(NFT)
    if (!isMobile) await expect(page.getByRole('link', { name: 'Carrinho, 3 itens' })).toBeVisible()
  })

  test('edição esgotada não pode ser escolhida', async ({ page }) => {
    await page.goto('/nfts/sage-nomad-009')
    const editions = page.getByRole('radiogroup', { name: 'Edição' }).filter({ visible: true })
    await expect(editions.getByRole('radio', { name: '1/1 (esgotada)', exact: true })).toBeDisabled()
  })

  test('favoritar exige sessão e persiste no perfil', async ({ page, isMobile }) => {
    await page.goto('/nfts/emerald-ape-042')
    const favorite = page.getByRole('button', { name: 'Favoritar', exact: true }).filter({ visible: true })
    await favorite.click()
    await expect(authDialog(page)).toBeVisible()
    await submitLogin(page)

    await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)
    await page.getByRole('button', { name: 'Favoritar', exact: true }).filter({ visible: true }).click()
    const favorited = isMobile ? 'Remover dos favoritos' : 'Favoritado'
    await expect(page.getByRole('button', { name: favorited }).filter({ visible: true })).toBeVisible()

    await page.goto('/conta/favoritos')
    await expect(page.getByText(NFT).first()).toBeVisible()
  })

  test('falha ao favoritar desfaz a marcação e avisa', async ({ page, isMobile }) => {
    await login(page)
    await page.goto('/nfts/emerald-ape-042')
    await enableScenario(page, 'favorites-failure')
    // With the default latency the optimistic state is visible before the error arrives.
    await disableScenario(page, 'no-latency')

    const favorited = isMobile ? 'Remover dos favoritos' : 'Favoritado'
    await page.getByRole('button', { name: 'Favoritar', exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole('button', { name: favorited }).filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true }).filter({ visible: true })).toBeVisible()
    await expect(
      page.getByText('Não foi possível atualizar os favoritos agora. Tente novamente.').filter({ visible: true }),
    ).toBeVisible()

    await page.goto('/conta/favoritos')
    await expect(page.getByText('Neon Vessel #552').first()).toBeVisible()
    await expect(page.getByText(NFT)).toHaveCount(0)
  })
})

test.describe('tempo real', () => {
  test('preço publicado pelo socket atualiza a página aberta', async ({ page }) => {
    await login(page)
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByText('1.19 ETH').filter({ visible: true }).first()).toBeVisible()
    await waitForRealtime(page)

    await page.evaluate(() => window.__kurioMock!.setPrice('emerald-ape-042', '1.50'))
    await expect(page.getByText('1.50 ETH').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('O preço foi atualizado de 1.19 ETH para 1.50 ETH.').filter({ visible: true })).toBeVisible()
  })

  test('estoque esgotado pelo socket bloqueia a compra', async ({ page, isMobile }) => {
    await page.goto('/nfts/golden-signal-160')
    await waitForRealtime(page)
    const editions = page.getByRole('radiogroup', { name: 'Edição' }).filter({ visible: true })
    await editions.getByRole('radio', { name: '1/10', exact: true }).click()

    await page.evaluate(() => window.__kurioMock!.setAvailability('golden-signal-160', '1-10', 0))
    await expect(editions.getByRole('radio', { name: '1/10 (esgotada)', exact: true })).toBeDisabled()
    const buy = page.getByRole('button', { name: isMobile ? 'Esgotado' : 'ESGOTADO', exact: true }).filter({ visible: true })
    await expect(buy).toBeDisabled()
  })

  test('eventos duplicados e fora de ordem não revertem o preço', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await waitForRealtime(page)
    await enableScenario(page, 'unreliable-events')
    await page.evaluate(async () => {
      const modulePath = '/src/lib/realtime/socket.ts'
      const { getSocket } = await import(/* @vite-ignore */ modulePath)
      const events: unknown[] = []
      ;(window as unknown as { __nftEvents: unknown[] }).__nftEvents = events
      getSocket().on('nft.updated', (update: unknown) => events.push(update))
    })
    const received = () => page.evaluate(() => (window as unknown as { __nftEvents: unknown[] }).__nftEvents.length)

    await page.evaluate(() => window.__kurioMock!.setPrice('emerald-ape-042', '1.50'))
    // The first change arrives twice.
    await expect.poll(received).toBe(2)
    await page.evaluate(() => window.__kurioMock!.setPrice('emerald-ape-042', '1.80'))
    // The second arrives twice, followed by the first one again.
    await expect.poll(received).toBe(5)

    await expect(page.getByText('1.80 ETH', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('O preço foi atualizado de 1.50 ETH para 1.80 ETH.').filter({ visible: true })).toBeVisible()
  })

  test('reconexão do socket recupera a mudança perdida enquanto estava offline', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    const price = (value: string) => page.getByText(value, { exact: true }).filter({ visible: true }).first()
    await expect(price('1.19 ETH')).toBeVisible()
    await waitForRealtime(page)

    await enableScenario(page, 'offline')
    await expect.poll(() => page.evaluate(() => window.__kurioMock!.realtimeClients())).toBe(0)
    // Nobody is connected to receive this event.
    await page.evaluate(() => window.__kurioMock!.setPrice('emerald-ape-042', '2.25'))
    await page.waitForTimeout(500)
    await expect(page.getByText('2.25 ETH', { exact: true }).filter({ visible: true })).toHaveCount(0)

    await disableScenario(page, 'offline')
    await expect(price('2.25 ETH')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('O preço foi atualizado de 1.19 ETH para 2.25 ETH.').filter({ visible: true })).toBeVisible()
  })
})
