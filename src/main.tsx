import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { env } from './config/env'

async function enableMocking() {
  if (!env.enableMocks) return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

// The app is imported only after MSW patches `WebSocket`: engine.io-client captures the
// constructor when its module is evaluated, and would otherwise bypass the socket mock.
enableMocking()
  .then(() => import('./App.tsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
