import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must run before @vitejs/plugin-react.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      codeSplittingOptions: {
        // Entry pages ship with the app chunk: a lazy route chunk adds one more network
        // round trip before their first paint.
        splitBehavior: ({ routeId }) => (routeId === '/' || routeId === '/nfts/$nftId' ? [] : undefined),
      },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      {
        find: /^tough-cookie$/,
        replacement: fileURLToPath(new URL('./src/mocks/shims/tough-cookie.ts', import.meta.url)),
      },
    ],
  },
  server: {
    watch: {
      // Playwright writes reports while tests run; watching them reloads every open page mid-test.
      ignored: [
        '**/playwright-report/**',
        '**/test-results/**',
        '**/blob-report/**',
        '**/.shots/**',
        '**/.playwright-libs/**',
        '**/.figma-tmp/**',
      ],
    },
  },
})
