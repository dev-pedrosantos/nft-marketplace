import { setupWorker } from 'msw/browser'
import { env } from '@/config/env'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export function startMockWorker() {
  const apiBaseUrl = new URL(env.apiUrl, window.location.origin).href

  return worker.start({
    onUnhandledRequest(request, print) {
      if (request.url.startsWith(apiBaseUrl)) print.warning()
    },
  })
}
