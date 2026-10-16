import { expect, test } from '@playwright/test'

test.describe('infrastructure smoke', () => {
  test('renders the root route', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('app-root')).toBeAttached()
  })

  test('activates the MSW worker in development', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('app-root')).toBeAttached()

    const workerUrl = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null,
    )
    expect(workerUrl).toContain('/mockServiceWorker.js')
  })

  test('connects the Socket.IO client to the mocked server', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('app-root')).toBeAttached()

    const connected = await page.evaluate(async () => {
      const modulePath = '/src/lib/realtime/socket.ts'
      const { connectSocket } = await import(/* @vite-ignore */ modulePath)
      const socket = connectSocket()

      return new Promise<boolean>((resolve) => {
        if (socket.connected) return resolve(true)
        socket.once('connect', () => resolve(true))
        socket.once('connect_error', () => resolve(false))
      })
    })
    expect(connected).toBe(true)
  })
})
