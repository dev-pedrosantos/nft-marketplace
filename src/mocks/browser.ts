import { setupWorker } from 'msw/browser'
import { env } from '@/config/env'
import { mockDevtools } from './devtools'
import { handlers } from './handlers'
import { resumePendingOrders } from './handlers/checkout'

export const worker = setupWorker(...handlers)

export async function startMockWorker() {
  const apiBaseUrl = new URL(env.apiUrl, window.location.origin).href

  await worker.start({
    onUnhandledRequest(request, print) {
      if (request.url.startsWith(apiBaseUrl)) print.warning()
    },
  })
  window.__kurioMock = mockDevtools
  resumePendingOrders()
}
