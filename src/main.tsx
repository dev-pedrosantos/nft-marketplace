import './index.css'

async function enableMocking() {
  // Read the flag inline (not through `env`) so builds without mocks drop the MSW chunk entirely.
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

// React does not touch `WebSocket`, so it downloads alongside MSW instead of before it.
const renderer = import('./render.tsx')

// The app is imported only after MSW patches `WebSocket`: engine.io-client captures the
// constructor when its module is evaluated, and would otherwise bypass the socket mock.
const app = enableMocking().then(() => import('./App.tsx'))

Promise.all([renderer, app]).then(([{ render }, { default: App }]) => render(App))
