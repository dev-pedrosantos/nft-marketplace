import { http, HttpResponse, type HttpHandler } from 'msw'
import type { LoginInput, RegisterInput, Session } from '@/features/auth/types'
import { validateLogin, validateRegister } from '@/lib/validation'
import { MAX_QUANTITY_PER_LINE } from '../data/nfts'
import { cartOf, commit, createId, db, SESSION_TTL_MS, type UserRecord } from '../db'
import {
  api,
  errorResponse,
  latency,
  publicUser,
  readJson,
  requireUser,
  validationError,
} from './utils'

function openSession(user: UserRecord): Session {
  const token = createId('token')
  const expiresAt = Date.now() + SESSION_TTL_MS
  db.sessions.push({ token, userId: user.id, expiresAt })
  return { token, expiresAt: new Date(expiresAt).toISOString(), user: publicUser(user) }
}

/** Moves what a visitor added before signing in into the account cart. */
function mergeGuestCart(request: Request, user: UserRecord) {
  const guestId = request.headers.get('X-Guest-Id')
  if (!guestId) return
  const guestKey = `guest:${guestId}`
  const guestCart = db.carts[guestKey]
  if (!guestCart || guestCart.lines.length === 0) return

  const userCart = cartOf(`user:${user.id}`)
  for (const line of guestCart.lines) {
    const existing = userCart.lines.find(
      (item) => item.nftId === line.nftId && item.editionId === line.editionId,
    )
    if (existing) {
      existing.quantity = Math.min(existing.quantity + line.quantity, MAX_QUANTITY_PER_LINE)
    } else {
      userCart.lines.push({ ...line })
    }
  }
  userCart.couponCode ??= guestCart.couponCode
  delete db.carts[guestKey]
}

export const authHandlers: HttpHandler[] = [
  http.post(api('/auth/login'), async ({ request }) => {
    await latency()
    const body = await readJson<LoginInput>(request)
    const invalid = validationError(validateLogin(body))
    if (invalid) return invalid

    const user = db.users.find(
      (item) => item.email.toLowerCase() === body.email!.trim().toLowerCase(),
    )
    if (!user || user.password !== body.password) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }

    mergeGuestCart(request, user)
    const session = openSession(user)
    commit()
    return HttpResponse.json(session)
  }),

  http.post(api('/auth/register'), async ({ request }) => {
    await latency()
    const body = await readJson<RegisterInput>(request)
    const invalid = validationError(validateRegister(body))
    if (invalid) return invalid

    const email = body.email!.trim().toLowerCase()
    const username = body.username!.trim()
    const fieldErrors: Record<string, string> = {}
    if (db.users.some((item) => item.email.toLowerCase() === email)) {
      fieldErrors.email = 'Já existe uma conta com este e-mail.'
    }
    if (db.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
      fieldErrors.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fieldErrors).length > 0) {
      return errorResponse(409, 'ACCOUNT_EXISTS', 'Revise os campos destacados.', fieldErrors)
    }

    const user: UserRecord = {
      id: createId('user'),
      email,
      password: body.password!,
      username,
      displayName: username,
      ensName: username.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      walletNickname: 'Principal',
      avatarUrl: null,
    }
    db.users.push(user)
    mergeGuestCart(request, user)
    const session = openSession(user)
    commit()
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post(api('/auth/logout'), async ({ request }) => {
    await latency()
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const ended = db.sessions.find((session) => session.token === token)
    if (ended) delete db.walletConnections[ended.userId]
    db.sessions = db.sessions.filter((session) => session.token !== token)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('/auth/me'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    return HttpResponse.json(publicUser(viewer.user))
  }),
]
