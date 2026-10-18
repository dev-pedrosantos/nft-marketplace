import emeraldApe from '@/assets/nfts/emerald-ape.webp'
import goldenBeat from '@/assets/nfts/golden-beat.webp'
import neonVessel from '@/assets/nfts/neon-vessel.webp'
import sageNomad from '@/assets/nfts/sage-nomad.webp'
import type { CatalogFilters, EditionId, FeaturedNft } from '@/features/nfts/types'
import type { DecimalString } from '@/lib/money'

export interface NftEditionRecord {
  id: EditionId
  label: string
  supply: number | null
  available: number
}

/** Server-side shape of an NFT; the handlers project it into the API types. */
export interface NftRecord {
  id: string
  name: string
  imageUrl: string
  priceEth: DecimalString
  previousPriceEth?: DecimalString
  isRare?: boolean
  tokenId: string
  categoryId: string
  series: { id: string; name: string }
  networkId: string
  attributes: string[]
  /** Minutes before "now" the NFT was listed; lower is more recent. */
  listedMinutesAgo: number
  trending: boolean
  rating: { average: string; count: number }
  summary: string
  description: string[]
  contractAddress: string
  editions: NftEditionRecord[]
  defaultEditionId: EditionId
}

export const NETWORKS = [
  {
    id: 'ethereum',
    label: 'Ethereum',
    info: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.',
    feeEth: '0.016',
  },
  {
    id: 'polygon',
    label: 'Polygon',
    info: 'Cunhado na Polygon com procedência imutável e metadados armazenados no IPFS.',
    feeEth: '0.002',
  },
  {
    id: 'solana',
    label: 'Solana',
    info: 'Cunhado na Solana com procedência imutável e metadados armazenados no Arweave.',
    feeEth: '0.001',
  },
] as const

export const ROYALTIES_INFO =
  'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.'

const KURIO_APES = { id: 'kurio-apes', name: 'Kurio Apes' }

function editions(available: [number, number, number, number]): NftEditionRecord[] {
  return [
    { id: '1-1', label: '1/1', supply: 1, available: available[0] },
    { id: '1-10', label: '1/10', supply: 10, available: available[1] },
    { id: '1-50', label: '1/50', supply: 50, available: available[2] },
    { id: 'open', label: 'ABERTA', supply: null, available: available[3] },
  ]
}

function describe(name: string, series: string, network: string): Pick<NftRecord, 'summary' | 'description'> {
  return {
    summary: `Um colecionável digital finalizado à mão da coleção ${series}, verificado na ${network}, com arte desbloqueável e acesso para colecionadores.`,
    description: [
      `${name} é uma obra digital finalizada à mão da coleção ${series}. Cada atributo fica armazenado nos metadados do token e verificado na ${network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. O criador recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
  }
}

function tokenIdFromName(name: string) {
  const number = name.split('#')[1] ?? '0'
  return `#${number.padStart(4, '0')}`
}

interface FigmaNftSeed {
  id: string
  name: string
  imageUrl: string
  priceEth: DecimalString
  previousPriceEth?: DecimalString
  isRare?: boolean
  attributes: string[]
  available: [number, number, number, number]
  trending?: boolean
}

// The eight NFTs of the "Desktop / Início" frame, most recent first, so the default
// catalog page matches the design. "Emerald Ape #042" carries the copy of the
// "Desktop / Detalhes do NFT" frame.
const FIGMA_NFTS: FigmaNftSeed[] = [
  {
    id: 'emerald-ape-042',
    name: 'Emerald Ape #042',
    imageUrl: emeraldApe,
    priceEth: '1.19',
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    available: [1, 4, 18, 120],
    trending: true,
  },
  {
    id: 'sage-nomad-009',
    name: 'Sage Nomad #009',
    imageUrl: sageNomad,
    priceEth: '1.69',
    attributes: ['Chapéu', 'Sálvia', 'Comum'],
    available: [0, 6, 22, 120],
  },
  {
    id: 'neon-vessel-552',
    name: 'Neon Vessel #552',
    imageUrl: neonVessel,
    priceEth: '1.99',
    previousPriceEth: '2.29',
    isRare: true,
    attributes: ['Neon', 'Terno', 'Raro'],
    available: [1, 3, 12, 80],
    trending: true,
  },
  {
    id: 'cosmic-bloom-118',
    name: 'Cosmic Bloom #118',
    imageUrl: sageNomad,
    priceEth: '1.29',
    attributes: ['Flores', 'Cósmico', 'Incomum'],
    available: [1, 7, 30, 120],
  },
  {
    id: 'violet-nomad-314',
    name: 'Violet Nomad #314',
    imageUrl: sageNomad,
    priceEth: '1.39',
    attributes: ['Capuz', 'Violeta', 'Incomum'],
    available: [1, 9, 25, 120],
    trending: true,
  },
  {
    id: 'ivory-baron-088',
    name: 'Ivory Baron #088',
    imageUrl: neonVessel,
    priceEth: '1.79',
    attributes: ['Marfim', 'Barão', 'Raro'],
    available: [1, 10, 40, 120],
  },
  {
    id: 'golden-beat-207',
    name: 'Golden Beat #207',
    imageUrl: goldenBeat,
    priceEth: '0.99',
    attributes: ['Fones', 'Dourado', 'Comum'],
    available: [1, 5, 33, 120],
  },
  {
    id: 'golden-signal-160',
    name: 'Golden Signal #160',
    imageUrl: goldenBeat,
    priceEth: '0.39',
    attributes: ['Antena', 'Dourado', 'Comum'],
    available: [0, 2, 9, 120],
  },
]

const figmaRecords: NftRecord[] = FIGMA_NFTS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  imageUrl: seed.imageUrl,
  priceEth: seed.priceEth,
  previousPriceEth: seed.previousPriceEth,
  isRare: seed.isRare,
  tokenId: tokenIdFromName(seed.name),
  categoryId: 'digital-art',
  series: KURIO_APES,
  networkId: 'ethereum',
  attributes: seed.attributes,
  listedMinutesAgo: 10 + index,
  trending: seed.trending ?? false,
  rating: { average: '4.8', count: 19 },
  contractAddress: '0x7a42c0de5f1b9e3a4d6c8b2e0f1a3c5e7d9b19e8',
  editions: editions(seed.available),
  defaultEditionId: '1-50',
  ...describe(seed.name, KURIO_APES.name, 'Ethereum'),
}))

/* -------------------------------------------------------------------------- */
/* Generated catalog: deterministic so pagination, filters and tests are stable. */

function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const IMAGES = [emeraldApe, sageNomad, neonVessel, goldenBeat]
const ADJECTIVES = [
  'Amber', 'Lunar', 'Crimson', 'Silent', 'Copper', 'Velvet', 'Solar', 'Hidden',
  'Rusty', 'Frosted', 'Electric', 'Midnight', 'Desert', 'Royal', 'Wild', 'Quiet',
]
const NOUNS = [
  'Oracle', 'Drifter', 'Monarch', 'Pilot', 'Echo', 'Ranger', 'Muse', 'Signal',
  'Voyager', 'Keeper', 'Rebel', 'Sage', 'Nomad', 'Baron', 'Vessel', 'Bloom',
]
const ATTRIBUTES = ['Óculos', 'Chapéu', 'Capuz', 'Fones', 'Dourado', 'Neon', 'Marfim', 'Esmeralda']
const RARITIES = ['Comum', 'Incomum', 'Raro']

// How many generated NFTs each category gets. "Arte digital" also holds the eight
// design NFTs: 8 + 24 = 32 items, which is the four pages shown by the design.
const GENERATED_PER_CATEGORY: Record<string, { count: number; label: string }> = {
  'digital-art': { count: 24, label: 'Editions' },
  photography: { count: 12, label: 'Lens' },
  music: { count: 65, label: 'Sound' },
  '3d-art': { count: 39, label: 'Forms' },
  collectibles: { count: 23, label: 'Vault' },
  generative: { count: 17, label: 'Code' },
  gaming: { count: 19, label: 'Arcade' },
  subscriptions: { count: 13, label: 'Pass' },
  utility: { count: 18, label: 'Utility' },
}

function priceBetween(random: () => number, min: number, max: number): DecimalString {
  const cents = Math.round((min + random() * (max - min)) * 100)
  return (cents / 100).toFixed(2)
}

function generateCatalog(): NftRecord[] {
  const random = seededRandom(42)
  const records: NftRecord[] = []
  let sequence = 0

  for (const [categoryId, { count, label }] of Object.entries(GENERATED_PER_CATEGORY)) {
    const series = { id: `kurio-${label.toLowerCase()}`, name: `Kurio ${label}` }
    for (let index = 0; index < count; index += 1) {
      sequence += 1
      const number = String(100 + ((sequence * 37) % 900))
      const name = `${ADJECTIVES[sequence % ADJECTIVES.length]} ${NOUNS[(sequence * 7) % NOUNS.length]} #${number}`
      const network = NETWORKS[sequence % NETWORKS.length]
      const rarity = RARITIES[sequence % RARITIES.length]
      const priceEth = priceBetween(random, 0.02, 12.3)
      records.push({
        id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-${sequence}`,
        name,
        imageUrl: IMAGES[sequence % IMAGES.length],
        priceEth,
        isRare: rarity === 'Raro' && sequence % 2 === 0,
        tokenId: tokenIdFromName(name),
        categoryId,
        series,
        networkId: network.id,
        attributes: [ATTRIBUTES[sequence % ATTRIBUTES.length], ATTRIBUTES[(sequence + 3) % ATTRIBUTES.length], rarity],
        listedMinutesAgo: 60 + sequence * 97,
        trending: sequence % 5 === 0,
        rating: { average: (4 + random()).toFixed(1), count: 3 + Math.floor(random() * 40) },
        contractAddress: `0x${(sequence * 2654435761).toString(16).padStart(8, '0').repeat(5).slice(0, 40)}`,
        editions: editions([
          sequence % 3 === 0 ? 0 : 1,
          1 + Math.floor(random() * 9),
          5 + Math.floor(random() * 45),
          100,
        ]),
        defaultEditionId: '1-50',
        ...describe(name, series.name, network.label),
      })
    }
  }
  return records
}

export const nftSeed: NftRecord[] = [...figmaRecords, ...generateCatalog()]

export const NFT_PAGE_SIZE = 8
export const RELATED_LIMIT = 5
/** Copies of one edition a single cart line can hold. */
export const MAX_QUANTITY_PER_LINE = 10
/** Listings newer than this count as "Novos lançamentos". */
export const NEW_RELEASE_WINDOW_MINUTES = 60 * 24 * 3

export const featuredNft: FeaturedNft = {
  id: 'featured-limited-offer',
  headline: 'NFT EM DESTAQUE',
  tagline: 'OFERTA LIMITADA',
  imageUrl: sageNomad,
}

// Facet counts come straight from the design and describe the whole collection,
// including items that are not listed for sale.
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
