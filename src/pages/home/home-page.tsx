import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MobileSearchBar } from '@/components/layout/mobile-search-bar'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Pagination } from '@/components/pagination'
import { blogQueries } from '@/features/blog/api'
import { BlogPostCard } from '@/features/blog/components/blog-post-card'
import { nftQueries } from '@/features/nfts/api'
import { CatalogFilters } from '@/features/nfts/components/catalog-filters'
import { FeaturedNftBanner } from '@/features/nfts/components/featured-nft-banner'
import { NftGrid } from '@/features/nfts/components/nft-grid'
import { NftTabs } from '@/features/nfts/components/nft-tabs'
import { SortLabel } from '@/features/nfts/components/sort-label'
import type { Nft, NftListParams } from '@/features/nfts/types'
import { promotionQueries } from '@/features/promotions/api'
import { PromoCard } from '@/features/promotions/components/promo-card'
import type { Paginated } from '@/types/api'
import { CATALOG_SECTION_ID, HomeHero, MobileHeroBanner } from './components/home-hero'
import type { HomeSearch } from './search'

const BLOG_POST_LIMIT = 4

export function HomePage() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })

  const filtersQuery = useQuery(nftQueries.filters())
  const featuredQuery = useQuery(nftQueries.featured())
  const promotionsQuery = useQuery(promotionQueries.list())
  const postsQuery = useQuery(blogQueries.latest(BLOG_POST_LIMIT))

  const filters = filtersQuery.data
  const collection = search.collection ?? filters?.collections[0]?.id
  const priceBounds = filters?.priceRange
  const price = priceBounds && {
    min: search.minPrice ?? priceBounds.min,
    max: search.maxPrice ?? priceBounds.max,
  }

  const listParams: NftListParams = {
    tab: search.tab ?? 'all',
    page: search.page ?? 1,
    sort: search.sort,
    collection,
    network: search.network,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    search: search.q,
  }
  const nftsQuery = useQuery({
    ...nftQueries.list(listParams),
    enabled: !filtersQuery.isPending,
  })

  const updateSearch = (patch: Partial<HomeSearch>, options?: { replace?: boolean }) =>
    navigate({
      search: (previous) => ({ ...previous, page: undefined, ...patch }),
      replace: options?.replace,
      resetScroll: false,
    })

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 pt-10 pb-[150px] md:gap-24 md:px-10 md:py-6 xl:px-[120px]">
        <div className="hidden flex-col gap-8 md:flex">
          <SiteHeader />
          <HomeHero />
        </div>

        <MobileSearchBar
          className="md:hidden"
          value={search.q ?? ''}
          onChange={(value) => updateSearch({ q: value || undefined }, { replace: true })}
        />
        <MobileHeroBanner className="md:hidden" />

        <section
          id={CATALOG_SECTION_ID}
          aria-label="Catálogo de NFTs"
          className="flex scroll-mt-6 items-start gap-12"
        >
          <aside className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
            {filters && price && (
              <CatalogFilters
                key={`${price.min}-${price.max}`}
                filters={filters}
                collection={collection}
                network={search.network}
                price={price}
                onCollectionChange={(id) => updateSearch({ collection: id })}
                onNetworkChange={(id) =>
                  updateSearch({ network: id === search.network ? undefined : id })
                }
                onPriceApply={(range) =>
                  updateSearch({
                    minPrice: range.min === priceBounds.min ? undefined : range.min,
                    maxPrice: range.max === priceBounds.max ? undefined : range.max,
                  })
                }
              />
            )}
            {featuredQuery.data && <FeaturedNftBanner nft={featuredQuery.data} />}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col items-end gap-10 md:gap-[88px]">
            <div className="flex w-full flex-col gap-4 md:gap-8">
              <div className="flex items-center justify-between gap-6">
                <NftTabs
                  value={listParams.tab}
                  onChange={(tab) => updateSearch({ tab: tab === 'all' ? undefined : tab })}
                />
                <SortLabel
                  value={listParams.sort ?? 'recent'}
                  onChange={(sort) => updateSearch({ sort: sort === 'recent' ? undefined : sort })}
                  className="max-md:hidden"
                />
              </div>

              <CatalogResults query={nftsQuery} />
            </div>

            {nftsQuery.data && (
              <Pagination
                className="max-md:self-center"
                page={nftsQuery.data.page}
                totalPages={nftsQuery.data.totalPages}
                onPageChange={(page) => updateSearch({ page })}
              />
            )}
          </div>
        </section>

        {promotionsQuery.data && promotionsQuery.data.length > 0 && (
          <section aria-label="Destaques" className="grid gap-6 max-md:mt-12 xl:grid-cols-2 xl:gap-7">
            {promotionsQuery.data.map((promotion) => (
              <PromoCard key={promotion.id} promotion={promotion} href={`#${CATALOG_SECTION_ID}`} />
            ))}
          </section>
        )}

        {postsQuery.data && postsQuery.data.length > 0 && (
          <section aria-labelledby="blog-title" className="flex flex-col items-center gap-10 max-md:mt-12">
            <header className="flex flex-col gap-3 text-center">
              <h2 id="blog-title" className="text-[28px] font-bold text-heading">
                Diário da Cunhagem
              </h2>
              <p className="text-sm text-muted-foreground">
                Histórias, guias e insights para colecionadores sobre o universo da propriedade
                digital.
              </p>
            </header>
            <div className="grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {postsQuery.data.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <SiteFooter className="max-md:mt-12" />
      </div>

      <MobileTabBar className="md:hidden" />
    </>
  )
}

function CatalogResults({ query }: { query: UseQueryResult<Paginated<Nft>> }) {
  if (query.isPending) {
    return (
      <p role="status" className="py-20 text-center text-sm text-muted-foreground">
        Carregando NFTs…
      </p>
    )
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-20 text-center text-sm">
        <p className="text-muted-foreground">Não foi possível carregar os NFTs.</p>
        <button type="button" onClick={() => query.refetch()} className="font-bold text-highlight">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (query.data.items.length === 0) {
    return (
      <p role="status" className="py-20 text-center text-sm text-muted-foreground">
        Nenhum NFT encontrado.
      </p>
    )
  }

  return <NftGrid nfts={query.data.items} />
}
