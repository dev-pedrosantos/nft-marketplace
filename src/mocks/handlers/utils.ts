import { delay, HttpResponse } from 'msw'
import { env } from '@/config/env'
import { findUserByToken, type UserRecord } from '../db'
import { isScenarioActive } from '../scenarios'

export const api = (path: string) => `${env.apiUrl}${path}`

const LATENCY_MS = 250
const VARIABLE_LATENCY_MS = { min: 300, max: 1500 }
const OUT_OF_ORDER_MAX_MS = 1500
const OUT_OF_ORDER_STEP_MS = 500

let waiting = 0

export async function latency() {
  if (isScenarioActive('out-of-order')) {
    // Each request that arrives while others wait answers 500 ms sooner than the previous one.
    const wait = Math.max(0, OUT_OF_ORDER_MAX_MS - waiting * OUT_OF_ORDER_STEP_MS)
    waiting += 1
    try {
      await delay(wait)
    } finally {
      waiting -= 1
    }
    return
  }
  if (isScenarioActive('variable-latency')) {
    const { min, max } = VARIABLE_LATENCY_MS
    await delay(min + Math.random() * (max - min))
    return
  }
  await delay(isScenarioActive('no-latency') ? 0 : LATENCY_MS)
}

export interface ApiErrorBody {
  code: string
  message: string
  fieldErrors?: Record<string, string>
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  return HttpResponse.json<ApiErrorBody>({ code, message, fieldErrors }, { status })
}

function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

export type Viewer =
  | { kind: 'user'; user: UserRecord; ownerKey: string; token: string }
  | { kind: 'guest'; ownerKey: string }

/**
 * Identifies who is calling. A missing token is a guest (identified by `X-Guest-Id`);
 * an expired or unknown token is rejected so the client can drop the session.
 */
export function resolveViewer(request: Request): Viewer | Response {
  const token = bearerToken(request)
  const auth = findUserByToken(token)

  if (auth.status === 'expired') {
    return errorResponse(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  }
  if (auth.status === 'invalid') {
    return errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  }
  if (auth.status === 'authenticated' && token) {
    return { kind: 'user', user: auth.user, ownerKey: `user:${auth.user.id}`, token }
  }

  const guestId = request.headers.get('X-Guest-Id')
  return { kind: 'guest', ownerKey: `guest:${guestId ?? 'anonymous'}` }
}

export function requireUser(request: Request) {
  const viewer = resolveViewer(request)
  if (viewer instanceof Response) return viewer
  if (viewer.kind === 'guest') {
    return errorResponse(401, 'UNAUTHENTICATED', 'Entre para continuar.')
  }
  return viewer
}

export function publicUser({ passwordHash: _passwordHash, ...user }: UserRecord) {
  return user
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) ?? {}) as Partial<T>
  } catch {
    return {}
  }
}

/** SHA-256 of the JSON value with object keys sorted, so property order does not matter. */
export async function fingerprint(value: unknown) {
  const json = JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : item,
  )
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function validationError(fieldErrors: Record<string, string | undefined>) {
  const errors = Object.fromEntries(
    Object.entries(fieldErrors).filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
  return Object.keys(errors).length > 0
    ? errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', errors)
    : null
}
