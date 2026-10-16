import emeraldApe from '@/assets/nfts/emerald-ape.png'
import goldenBeat from '@/assets/nfts/golden-beat.png'
import neonVessel from '@/assets/nfts/neon-vessel.png'
import sageNomad from '@/assets/nfts/sage-nomad.png'
import type { CatalogFilters, FeaturedNft, Nft } from '@/features/nfts/types'

// Content of the "Desktop / Início" frame. The Figma grid has a ninth card without
// name or price (row 3, column 2); it is left out instead of inventing its data.
export const nfts: Nft[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', imageUrl: emeraldApe, priceEth: 1.19 },
  { id: 'sage-nomad-009', name: 'Sage Nomad #009', imageUrl: sageNomad, priceEth: 1.69 },
  {
    id: 'neon-vessel-552',
    name: 'Neon Vessel #552',
    imageUrl: neonVessel,
    priceEth: 1.99,
    previousPriceEth: 2.29,
    isRare: true,
  },
  { id: 'cosmic-bloom-118', name: 'Cosmic Bloom #118', imageUrl: sageNomad, priceEth: 1.29 },
  { id: 'violet-nomad-314', name: 'Violet Nomad #314', imageUrl: sageNomad, priceEth: 1.39 },
  { id: 'ivory-baron-088', name: 'Ivory Baron #088', imageUrl: neonVessel, priceEth: 1.79 },
  { id: 'golden-beat-207', name: 'Golden Beat #207', imageUrl: goldenBeat, priceEth: 0.99 },
  { id: 'golden-signal-160', name: 'Golden Signal #160', imageUrl: goldenBeat, priceEth: 0.39 },
]

// The pagination in the design shows four pages, but only the first one has content.
export const NFT_TOTAL_PAGES = 4
export const NFT_PAGE_SIZE = 9

export const featuredNft: FeaturedNft = {
  id: 'featured-limited-offer',
  headline: 'NFT EM DESTAQUE',
  tagline: 'OFERTA LIMITADA',
  imageUrl: sageNomad,
}

export const catalogFilters: CatalogFilters = {
  collections: [
    { id: 'digital-art', label: 'Arte digital', count: 33 },
    { id: 'photography', label: 'Fotografia', count: 12 },
    { id: 'music', label: 'Música', count: 65 },
    { id: '3d-art', label: 'Arte 3D', count: 39 },
    { id: 'collectibles', label: 'Colecionáveis', count: 23 },
    { id: 'generative', label: 'Generativa', count: 17 },
    { id: 'gaming', label: 'Jogos', count: 19 },
    { id: 'subscriptions', label: 'Assinaturas', count: 13 },
    { id: 'utility', label: 'Utilidade', count: 18 },
  ],
  networks: [
    { id: 'ethereum', label: 'Ethereum', count: 119 },
    { id: 'polygon', label: 'Polygon', count: 78 },
    { id: 'solana', label: 'Solana', count: 86 },
  ],
  priceRange: { min: 0.02, max: 12.3 },
}
