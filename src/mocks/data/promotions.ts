import emeraldApe from '@/assets/nfts/emerald-ape.png'
import neonVessel from '@/assets/nfts/neon-vessel.png'
import type { Promotion } from '@/features/promotions/types'

export const promotions: Promotion[] = [
  {
    id: 'genesis-drops',
    title: 'Lançamentos gênesis\nde edição limitada',
    description:
      'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    ctaLabel: 'Explorar',
    imageUrl: emeraldApe,
  },
  {
    id: 'curated-art',
    title: 'Arte digital selecionada\ne muito mais',
    description:
      'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    ctaLabel: 'Explorar',
    imageUrl: neonVessel,
  },
]
