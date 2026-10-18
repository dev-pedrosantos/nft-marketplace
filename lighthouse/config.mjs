import desktopConfig from 'lighthouse/core/config/desktop-config.js'

/** Pages audited against the demo build (`npm run build:demo`) with the default mock scenario. */
export const pages = [
  { id: 'home', path: '/' },
  { id: 'nft-details', path: '/nfts/emerald-ape-042' },
]

/**
 * Lighthouse defaults: "mobile" emulates a Moto G Power on slow 4G with 4x CPU slowdown,
 * "desktop" uses the stock desktop preset. Both use simulated throttling.
 */
export const profiles = [
  { id: 'mobile', config: undefined },
  { id: 'desktop', config: desktopConfig },
]

export const runsPerPage = 3

export const categories = ['performance', 'accessibility', 'best-practices', 'seo']

export const metrics = {
  lcp: 'largest-contentful-paint',
  cls: 'cumulative-layout-shift',
  tbt: 'total-blocking-time',
}

export const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

export const previewPort = 4173

export const chromeFlags = [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
]
