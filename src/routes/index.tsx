import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/pages/home/home-page'
import { parseHomeSearch } from '@/pages/home/search'

export const Route = createFileRoute('/')({
  validateSearch: parseHomeSearch,
  component: () => (
    <main data-testid="app-root">
      <HomePage />
    </main>
  ),
})
