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
  /** Where the user was when the session expired; signing in again returns there. */
  returnTo: string | null
}

type Listener = () => void

const listeners = new Set<Listener>()
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function isExpired(session: Session) {
  return Date.parse(session.expiresAt) <= Date.now()
}

const SIGNED_OUT: SessionState = { session: null, expired: false, returnTo: null }

function currentPlace() {
  const url = new URL(window.location.href)
  url.searchParams.delete('auth')
  url.searchParams.delete('redirect')
  return `${url.pathname}${url.search}${url.hash}`
}

function readStorage(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return SIGNED_OUT
    const session = JSON.parse(raw) as Session
    return isExpired(session)
      ? { session: null, expired: true, returnTo: currentPlace() }
      : { session, expired: false, returnTo: null }
  } catch {
    return SIGNED_OUT
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
    setState({ session, expired: false, returnTo: null })
  },
  updateUser(user: User) {
    if (state.session) setState({ ...state, session: { ...state.session, user } })
  },
  end(reason: SessionEndReason) {
    if (reason === 'logout') {
      if (state.session) setState(SIGNED_OUT)
      return
    }
    // Several requests can fail with the same expiry; keep the first place it was noticed.
    setState({ session: null, expired: true, returnTo: state.expired ? state.returnTo : currentPlace() })
  },
  dismissExpired() {
    if (state.expired) setState({ ...state, expired: false, returnTo: null }, false)
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
