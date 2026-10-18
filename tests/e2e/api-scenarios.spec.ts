import type { Page } from '@playwright/test'
import { disableScenario, enableScenario, expect, test, waitForMocks } from './support.ts'

const DETAILS_PATH = '/nfts/emerald-ape-042'
const NFT = 'Emerald Ape #042'

/** Counts the app's requests for the NFT details (not the related list). */
function countDetailRequests(page: Page) {
  const counter = { value: 0 }
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === `/api${DETAILS_PATH}`) counter.value += 1
  })
  return counter
}

function catalogCards(page: Page) {
  return page
    .getByRole('region', { name: 'Catálogo de NFTs' })
    .getByRole('listitem')
    .filter({ has: page.locator('a[href^="/nfts/"]') })
}

/** Enables a scenario on a loaded page, so the next navigation starts with it. */
async function startWith(page: Page, scenario: Parameters<typeof enableScenario>[1]) {
  await page.goto('/')
  await waitForMocks(page)
  await enableScenario(page, scenario)
}

test.describe('cenários da API simulada', () => {
  test('offline mostra erro de conexão e a página se recupera quando a conexão volta', async ({ page }) => {
    await startWith(page, 'offline')
    await page.goto(DETAILS_PATH)

    const error = page.getByRole('alert').filter({ hasText: 'Não foi possível falar com o servidor.' })
    await expect(error).toBeVisible({ timeout: 10_000 })
    await expect(error.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()

    // No click: the socket reconnects (retries back off up to 5 s) and the reconciliation refetches.
    await disableScenario(page, 'offline')
    await expect(page.getByRole('heading', { name: NFT }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('erro 500 é repetido automaticamente antes de oferecer nova tentativa', async ({ page }) => {
    await startWith(page, 'http-500')
    const requests = countDetailRequests(page)
    await page.goto(DETAILS_PATH)

    const error = page.getByRole('alert').filter({ hasText: 'Erro interno do servidor.' })
    await expect(error).toBeVisible({ timeout: 10_000 })
    // The page query tries three times (the route prefetch may add one attempt without retries).
    expect(requests.value).toBeGreaterThanOrEqual(3)

    await disableScenario(page, 'http-500')
    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { name: NFT }).first()).toBeVisible()
  })

  test('erro 429 não é repetido automaticamente', async ({ page }) => {
    await startWith(page, 'http-429')
    const requests = countDetailRequests(page)
    await page.goto(DETAILS_PATH)

    await expect(page.getByRole('alert').filter({ hasText: 'Muitas requisições em pouco tempo.' })).toBeVisible()
    const whenShown = requests.value
    // Longer than the first automatic retry would take.
    await page.waitForTimeout(1500)
    expect(requests.value).toBe(whenShown)
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  test('respostas fora de ordem não substituem a aba escolhida por último', async ({ page }) => {
    await page.goto('/?tab=trending')
    await expect(catalogCards(page).first()).toBeVisible()
    const trending = await catalogCards(page).allInnerTexts()

    await page.goto('/')
    await expect(catalogCards(page).first()).toBeVisible()
    await enableScenario(page, 'out-of-order')
    // "Novos lançamentos" answers after "Em alta", which was requested later.
    await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
    await page.getByRole('tab', { name: 'Em alta' }).click()

    await expect(page).toHaveURL(/tab=trending/)
    await expect.poll(() => catalogCards(page).allInnerTexts(), { timeout: 5_000 }).toEqual(trending)
    // Past the slowest response: nothing replaces the list afterwards.
    await page.waitForTimeout(1500)
    expect(await catalogCards(page).allInnerTexts()).toEqual(trending)
    await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
  })

  test('latência variável mostra o skeleton até o catálogo chegar', async ({ page }) => {
    await startWith(page, 'variable-latency')
    await page.goto('/')

    await expect(page.getByRole('status', { name: 'Carregando NFTs' })).toBeVisible()
    await expect(catalogCards(page).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('status', { name: 'Carregando NFTs' })).toHaveCount(0)
  })
})
