import { useSyncExternalStore } from 'react'
import type { Session, User } from './types'

const SESSION_KEY = 'kurio.session'
const GUEST_KEY = 'kurio.guest-id'
/** setTimeout overflows above ~24.8 days. */
const MAX_TIMER_MS = 2_147_483_647

export type SessionEndReason = 'logout' | 'expired'

export interface SessionState {
  session: Session | null
  /** Set when the session ended because it expired, until the user signs in again. */
  expired: boolean
}

type Listener = () => void

const listeners = new Set<Listener>()
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function isExpired(session: Session) {
  return Date.parse(session.expiresAt) <= Date.now()
}

function readStorage(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return { session: null, expired: false }
    const session = JSON.parse(raw) as Session
    return isExpired(session) ? { session: null, expired: true } : { session, expired: false }
  } catch {
    return { session: null, expired: false }
  }
}

let state: SessionState = readStorage()

function emit() {
  for (const listener of listeners) listener()
}

function armExpiryTimer() {
  clearTimeout(expiryTimer)
  if (!state.session) return
  const wait = Date.parse(state.session.expiresAt) - Date.now()
  expiryTimer = setTimeout(() => sessionStore.end('expired'), Math.min(Math.max(wait, 0), MAX_TIMER_MS))
}

function setState(next: SessionState, persist = true) {
  state = next
  if (persist) {
    if (next.session) localStorage.setItem(SESSION_KEY, JSON.stringify(next.session))
    else localStorage.removeItem(SESSION_KEY)
  }
  armExpiryTimer()
  emit()
}

// Keeps every open tab on the same session.
window.addEventListener('storage', (event) => {
  if (event.key === SESSION_KEY) setState(readStorage(), false)
})

armExpiryTimer()

export const sessionStore = {
  get: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  start(session: Session) {
    setState({ session, expired: false })
  },
  updateUser(user: User) {
    if (state.session) setState({ ...state, session: { ...state.session, user } })
  },
  end(reason: SessionEndReason) {
    if (!state.session && reason === 'logout') return
    setState({ session: null, expired: reason === 'expired' })
  },
  dismissExpired() {
    if (state.expired) setState({ ...state, expired: false }, false)
  },
  token: () => state.session?.token ?? null,
  /** Stable anonymous id that scopes the visitor cart on the server. */
  guestId() {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  },
}

export type SessionStore = typeof sessionStore

export function useSessionState() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
}

export function useSession() {
  return useSessionState().session
}

/** Scopes per-user query keys: data of one account is never served to another. */
export function useViewerKey() {
  return useSession()?.user.id ?? 'guest'
}
