import { Link } from '@tanstack/react-router'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { AccountLayout } from '@/features/account/components/account-layout'
import { useFavorites } from '@/features/favorites/api'
import { NftGrid } from '@/features/nfts/components/nft-grid'
import { errorMessage } from '@/lib/api/errors'

export function FavoritesPage() {
  const query = useFavorites()

  return (
    <AccountLayout section="favorites">
      <section aria-labelledby="favorites-title" className="flex flex-col gap-8">
        <h1 id="favorites-title" className="text-base leading-4 font-bold">
          Lista de interesse
        </h1>
        {query.isPending ? (
          <div role="status" aria-label="Carregando favoritos" className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="aspect-[258/300]" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Não foi possível carregar seus favoritos.')}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="Nenhum NFT favoritado"
            description="Toque no coração de um NFT para acompanhá-lo aqui."
            action={
              <Link to="/" hash="catalogo" className="text-sm font-bold text-highlight">
                Explorar o mercado
              </Link>
            }
          />
        ) : (
          <NftGrid nfts={query.data} className="lg:grid-cols-3" />
        )}
      </section>
    </AccountLayout>
  )
}
