import type { EditionId } from '@/features/nfts/types'
import type { DecimalString } from '@/lib/money'
import { commit, db, resetDb, updateInventory } from './db'
import { dropRealtimeConnections, realtimeClientCount, redeliverEvent } from './realtime'
import {
  activeScenarios,
  disableScenario,
  enableScenario,
  MOCK_SCENARIOS,
  type MockScenario,
} from './scenarios'

/**
 * Console and e2e hooks for the simulated backend, available as `window.__kurioMock`
 * only when mocks are enabled.
 */
export const mockDevtools = {
  scenarios: MOCK_SCENARIOS,
  active: activeScenarios,
  enable: (scenario: MockScenario) => {
    enableScenario(scenario)
    if (scenario === 'offline') dropRealtimeConnections()
  },
  disable: (scenario: MockScenario) => disableScenario(scenario),
  /** Restores the seed data (users, carts, stock, orders). */
  reset: () => resetDb(),
  /** Makes every open session expire, as if the TTL had elapsed. */
  expireSessions: () => {
    for (const session of db.sessions) session.expiresAt = Date.now() - 1
    commit()
  },
  /** Simulates a concurrent price change and broadcasts `nft.updated`. */
  setPrice: (nftId: string, priceEth: DecimalString) => updateInventory(nftId, { priceEth }),
  /** Simulates a concurrent purchase and broadcasts `nft.updated`. */
  setAvailability: (nftId: string, editionId: EditionId, available: number) =>
    updateInventory(nftId, { available: { [editionId]: available } }),
  /** Open Socket.IO connections; tests wait for one before simulating realtime events. */
  realtimeClients: () => realtimeClientCount(),
  /** Sends a past realtime event again with the same `eventId` (duplicate or late delivery). */
  redeliverEvent: (eventId: string) => redeliverEvent(eventId),
}

declare global {
  interface Window {
    __kurioMock?: typeof mockDevtools
  }
}
