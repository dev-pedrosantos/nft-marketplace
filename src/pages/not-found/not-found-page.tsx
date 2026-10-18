import { Link } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { EmptyState } from '@/components/ui/states'

/** Unknown URLs. The design has no 404 frame, so it reuses the shared empty state. */
export function NotFoundPage() {
  return (
    <PageShell active={null} divider={false} tabBar>
      <div className="flex flex-col max-md:px-7 max-md:pt-8">
        <h1 className="sr-only">Erro 404</h1>
        <EmptyState
          title="Página não encontrada"
          description="O endereço pode ter mudado ou não existe. Confira o link ou volte ao mercado."
          action={
            <Link to="/" className="text-[15px] font-bold text-highlight">
              Voltar ao início
            </Link>
          }
        />
      </div>
    </PageShell>
  )
}
