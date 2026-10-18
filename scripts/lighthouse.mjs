/**
 * Lighthouse audit of the demo build: every page × profile is measured `runsPerPage` times,
 * the median of each category and metric is reported, and every run's HTML/JSON is kept.
 *
 * Usage: `npm run lighthouse` (builds the demo first). Chrome comes from CHROME_PATH or,
 * by default, the Chromium installed by Playwright.
 */
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { categories, chromeFlags, metrics, pages, previewPort, profiles, runsPerPage, targets } from '../lighthouse/config.mjs'

const root = path.resolve(import.meta.dirname, '..')
const reportsDir = path.join(root, 'lighthouse', 'reports')
const baseUrl = `http://localhost:${previewPort}`

function startPreview() {
  const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
  const server = spawn(process.execPath, [vite, 'preview', '--port', String(previewPort), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes(String(previewPort))) resolve(server)
    })
    server.on('exit', (code) => reject(new Error(`vite preview exited with code ${code}`)))
  })
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Chrome is started directly rather than through chrome-launcher, which under WSL hands a
 * Windows-style profile path to the Linux binary and never connects.
 */
async function launchChrome() {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'kurio-lighthouse-'))
  const chrome = spawn(
    process.env.CHROME_PATH || chromium.executablePath(),
    [...chromeFlags, '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const port = await new Promise((resolve, reject) => {
    let stderr = ''
    chrome.stderr.on('data', (chunk) => {
      stderr += chunk
      const match = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(stderr)
      if (match) resolve(Number(match[1]))
    })
    chrome.on('exit', (code) => reject(new Error(`Chrome exited with code ${code}:\n${stderr}`)))
  })
  return {
    port,
    async kill() {
      const exited = new Promise((resolve) => chrome.once('exit', resolve))
      chrome.kill()
      await exited
      await rm(userDataDir, { recursive: true, force: true })
    },
  }
}

async function audit(url, profile) {
  const chrome = await launchChrome()
  try {
    const result = await lighthouse(
      url,
      { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
      profile.config,
    )
    if (!result) throw new Error(`Lighthouse returned no result for ${url}`)
    return result
  } finally {
    await chrome.kill()
  }
}

const server = await startPreview()
const results = []
let environment
try {
  await rm(reportsDir, { recursive: true, force: true })
  await mkdir(reportsDir, { recursive: true })

  for (const page of pages) {
    for (const profile of profiles) {
      const runs = []
      for (let run = 1; run <= runsPerPage; run += 1) {
        const { lhr, report } = await audit(baseUrl + page.path, profile)
        const name = `${page.id}-${profile.id}-${run}`
        await writeFile(path.join(reportsDir, `${name}.report.html`), report[0])
        await writeFile(path.join(reportsDir, `${name}.report.json`), report[1])
        environment ??= {
          lighthouse: lhr.lighthouseVersion,
          userAgent: lhr.environment.hostUserAgent,
          benchmarkIndex: lhr.environment.benchmarkIndex,
        }
        const scores = Object.fromEntries(categories.map((id) => [id, Math.round(lhr.categories[id].score * 100)]))
        const values = Object.fromEntries(
          Object.entries(metrics).map(([key, audit]) => [key, lhr.audits[audit].numericValue]),
        )
        runs.push({ run, scores, metrics: values, runtimeError: lhr.runtimeError?.message })
        console.log(name, JSON.stringify(scores), `LCP ${Math.round(values.lcp)}ms CLS ${values.cls.toFixed(3)} TBT ${Math.round(values.tbt)}ms`)
      }
      results.push({
        page: page.id,
        path: page.path,
        profile: profile.id,
        runs,
        median: {
          scores: Object.fromEntries(categories.map((id) => [id, median(runs.map((run) => run.scores[id]))])),
          metrics: Object.fromEntries(Object.keys(metrics).map((key) => [key, median(runs.map((run) => run.metrics[key]))])),
        },
      })
    }
  }
} finally {
  server.kill()
}

const summary = {
  generatedAt: new Date().toISOString(),
  build: 'npm run build:demo (MSW enabled, default mock scenario), served by vite preview',
  environment: {
    ...environment,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: `${os.cpus()[0]?.model ?? 'unknown'} × ${os.cpus().length}`,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  },
  runsPerPage,
  targets,
  results,
}
await writeFile(path.join(root, 'lighthouse', 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)

const header = `| Página | Perfil | ${categories.join(' | ')} | LCP | CLS | TBT |`
const rows = results.map(({ page, profile, median: m }) => {
  const cells = categories.map((id) => `${m.scores[id]}${m.scores[id] < targets[id] ? ' ⚠' : ''}`)
  return `| ${page} | ${profile} | ${cells.join(' | ')} | ${(m.metrics.lcp / 1000).toFixed(2)} s | ${m.metrics.cls.toFixed(3)} | ${Math.round(m.metrics.tbt)} ms |`
})
const markdown = [
  '# Lighthouse — medianas',
  '',
  `Gerado em ${summary.generatedAt} com Lighthouse ${summary.environment.lighthouse}, ${runsPerPage} execuções por página e perfil.`,
  '',
  header,
  `|${' --- |'.repeat(categories.length + 5)}`,
  ...rows,
  '',
  '⚠ abaixo da meta. Detalhes por execução em `summary.json`; relatórios em `reports/`.',
  '',
].join('\n')
await writeFile(path.join(root, 'lighthouse', 'summary.md'), markdown)
console.log(`\n${markdown}`)
