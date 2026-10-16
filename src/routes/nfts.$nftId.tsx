import { createFileRoute } from '@tanstack/react-router'
import { nftQueries } from '@/features/nfts/api'
import { NftDetailsPage } from '@/pages/nft-details/nft-details-page'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context, params }) => {
    // Prefetch only: loading and error states are rendered by the page itself.
    void context.queryClient.prefetchQuery(nftQueries.detail(params.nftId))
  },
  component: function NftDetailsRoute() {
    const { nftId } = Route.useParams()
    return <NftDetailsPage nftId={nftId} />
  },
})
