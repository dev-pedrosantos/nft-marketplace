import emeraldApe from '@/assets/nfts/emerald-ape.webp'
import goldenBeat from '@/assets/nfts/golden-beat.webp'
import neonVessel from '@/assets/nfts/neon-vessel.webp'
import sageNomad from '@/assets/nfts/sage-nomad.webp'
import type { BlogPost } from '@/features/blog/types'

// The design shows only day and month; the year matches the footer copyright (2026).
export const posts: BlogPost[] = [
  {
    id: 'how-nft-ownership-works',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    imageUrl: neonVessel,
    publishedAt: '2026-09-12',
    readingTimeMinutes: 6,
  },
  {
    id: 'digital-artists-to-follow',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    imageUrl: emeraldApe,
    publishedAt: '2026-09-13',
    readingTimeMinutes: 2,
  },
  {
    id: 'rarity-traits-provenance',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    imageUrl: sageNomad,
    publishedAt: '2026-09-15',
    readingTimeMinutes: 3,
  },
  {
    id: 'protect-your-wallet',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    imageUrl: goldenBeat,
    publishedAt: '2026-09-15',
    readingTimeMinutes: 2,
  },
]
