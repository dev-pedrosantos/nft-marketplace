import type { User } from '@/features/auth/types'
import type { EditionId, NftUpdate } from '@/features/nfts/types'
import type { CheckoutQuote, Order } from '@/features/orders/types'
import type { Wallet } from '@/features/wallets/types'
import type { DecimalString } from '@/lib/money'
import { nftSeed, type NftRecord } from './data/nfts'
import { broadcastNftUpdate } from './realtime'

/**
 * In-memory "database" of the simulated backend. It is persisted to localStorage so
 * sessions, carts and orders survive reloads, exactly like a real server would.
 */

export interface UserRecord extends User {
  password: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: number
}

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
  priceAtAddEth: DecimalString
}

export interface CartRecord {
  lines: CartLineRecord[]
  couponCode: string | null
}

export interface InventoryRecord {
  priceEth: DecimalString
  available: Record<EditionId, number>
  version: number
}

export interface Reservation {
  nftId: string
  editionId: EditionId
  quantity: number
}

export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  settleAt: number
  outcome: 'confirmed' | 'failed'
  reservations: Reservation[]
}

export interface QuoteRecord {
  quote: CheckoutQuote
  userId: string
  couponCode: string | null
  used: boolean
}

interface DbState {
  version: number
  users: UserRecord[]
  sessions: SessionRecord[]
  /** Keyed by `user:<id>` or `guest:<id>`. */
  carts: Record<string, CartRecord>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  orders: OrderRecord[]
  quotes: Record<string, QuoteRecord>
  inventory: Record<string, InventoryRecord>
}

const STORAGE_KEY = 'kurio.mock-db'
const SCHEMA_VERSION = 1
export const SESSION_TTL_MS = 30 * 60 * 1000

export const DEMO_USER_ID = 'user-demo'

function seedInventory(): Record<string, InventoryRecord> {
  return Object.fromEntries(
    nftSeed.map((nft) => [
      nft.id,
      {
        priceEth: nft.priceEth,
        available: Object.fromEntries(nft.editions.map((edition) => [edition.id, edition.available])) as Record<
          EditionId,
          number
        >,
        version: 1,
      },
    ]),
  )
}

function seed(): DbState {
  const createdAt = '2026-07-01T12:00:00.000Z'
  return {
    version: SCHEMA_VERSION,
    users: [
      {
        id: DEMO_USER_ID,
        email: 'colecionador@kurio.com',
        password: 'kurio123',
        username: 'nova.sato',
        displayName: 'Nova Sato',
        ensName: 'nova.kurio',
        walletNickname: 'Principal',
        avatarUrl: null,
      },
      {
        id: 'user-ana',
        email: 'ana@kurio.com',
        password: 'kurio123',
        username: 'ana.lima',
        displayName: 'Ana Lima',
        ensName: 'ana',
        walletNickname: 'Principal',
        avatarUrl: null,
      },
    ],
    sessions: [],
    // The demo collector's cart reproduces the "Desktop / Carrinho de NFTs" frame.
    carts: {
      [`user:${DEMO_USER_ID}`]: {
        couponCode: null,
        lines: [
          { id: 'line-demo-1', nftId: 'emerald-ape-042', editionId: '1-50', quantity: 2, priceAtAddEth: '1.19' },
          { id: 'line-demo-2', nftId: 'violet-nomad-314', editionId: '1-50', quantity: 6, priceAtAddEth: '1.39' },
          { id: 'line-demo-3', nftId: 'ivory-baron-088', editionId: '1-50', quantity: 9, priceAtAddEth: '1.79' },
        ],
      },
    },
    favorites: { [DEMO_USER_ID]: ['neon-vessel-552'] },
    wallets: {
      [DEMO_USER_ID]: [
        {
          id: 'wallet-demo-primary',
          role: 'primary',
          displayName: 'Nova Sato',
          nickname: 'Principal',
          networkId: 'ethereum',
          profileName: 'nova.sato',
          address: '0xa91f4b7c2d9e0f13a5b6c7d8e9f0a1b2c3d4e82c',
          ensOrSecondary: '',
          walletType: 'browser',
          referralCode: 'KURIO-NOVA',
          email: 'colecionador@kurio.com',
          ensName: 'nova.kurio',
          createdAt,
        },
        {
          id: 'wallet-demo-secondary',
          role: 'secondary',
          displayName: 'Nova Sato',
          nickname: 'Reserva',
          networkId: 'polygon',
          profileName: 'nova.sato',
          address: '0x5c3e9a1b7d2f4e6a8c0b1d3f5a7c9e1b3d5f7a90',
          ensOrSecondary: 'nova.kurio.eth',
          walletType: 'mobile',
          referralCode: 'KURIO-NOVA',
          email: 'colecionador@kurio.com',
          ensName: 'nova.kurio',
          createdAt,
        },
      ],
    },
    orders: [],
    quotes: {},
    inventory: seedInventory(),
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.version === SCHEMA_VERSION) return parsed
    }
  } catch {
    // Corrupted storage falls back to the seed.
  }
  return seed()
}

export let db: DbState = load()

export function commit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function resetDb() {
  db = seed()
  commit()
}

/* -------------------------------------------------------------------------- */

const nftById = new Map(nftSeed.map((nft) => [nft.id, nft]))

export function findNft(id: string): NftRecord | undefined {
  return nftById.get(id)
}

export function inventoryOf(id: string): InventoryRecord {
  const inventory = db.inventory[id]
  if (!inventory) throw new Error(`Unknown NFT: ${id}`)
  return inventory
}

export function toNftUpdate(id: string): NftUpdate {
  const inventory = inventoryOf(id)
  return {
    id,
    priceEth: inventory.priceEth,
    editions: Object.entries(inventory.available).map(([editionId, available]) => ({
      id: editionId as EditionId,
      available,
    })),
    version: inventory.version,
  }
}

/** Applies a price or stock change, persists it and broadcasts `nft.updated`. */
export function updateInventory(
  id: string,
  change: { priceEth?: DecimalString; available?: Partial<Record<EditionId, number>> },
) {
  const inventory = inventoryOf(id)
  if (change.priceEth) inventory.priceEth = change.priceEth
  if (change.available) Object.assign(inventory.available, change.available)
  inventory.version += 1
  commit()
  broadcastNftUpdate(toNftUpdate(id))
}

export function findUserByToken(token: string | null) {
  if (!token) return { status: 'anonymous' as const }
  const session = db.sessions.find((item) => item.token === token)
  if (!session) return { status: 'invalid' as const }
  if (session.expiresAt <= Date.now()) return { status: 'expired' as const }
  const user = db.users.find((item) => item.id === session.userId)
  return user ? { status: 'authenticated' as const, user, session } : { status: 'invalid' as const }
}

export function cartOf(ownerKey: string): CartRecord {
  db.carts[ownerKey] ??= { lines: [], couponCode: null }
  return db.carts[ownerKey]
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function randomHex(bytes: number) {
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  return `0x${Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')}`
}
