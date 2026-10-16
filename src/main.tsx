import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { env } from './config/env'

async function enableMocking() {
  if (!env.enableMocks) return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
