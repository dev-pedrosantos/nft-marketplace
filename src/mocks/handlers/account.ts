import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { PasswordChangeInput, ProfileInput } from '@/features/profile/types'
import {
  WALLET_PROVIDERS,
  type Wallet,
  type WalletConnection,
  type WalletInput,
  type WalletRole,
} from '@/features/wallets/types'
import { validatePasswordChange, validateProfile, validateWallet } from '@/lib/validation'
import { commit, createId, db, findNft, randomHex } from '../db'
import { hashPassword, verifyPassword } from '../passwords'
import { toNft } from '../projections'
import { isScenarioActive } from '../scenarios'
import {
  api,
  errorResponse,
  latency,
  publicUser,
  readJson,
  requireUser,
  validationError,
} from './utils'

/** Time the collector takes to approve the request in the (simulated) wallet. */
const WALLET_APPROVAL_MS = 800

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
/** Data URLs are ~4/3 of the file size; this keeps uploads around 1 MB. */
const AVATAR_MAX_DATA_URL_LENGTH = 1_400_000

const WALLET_FIELDS: (keyof WalletInput)[] = [
  'displayName',
  'nickname',
  'networkId',
  'profileName',
  'address',
  'ensOrSecondary',
  'walletType',
  'referralCode',
  'email',
  'ensName',
]

function pickWallet(body: Partial<WalletInput>): WalletInput {
  return Object.fromEntries(
    WALLET_FIELDS.map((field) => [field, String(body[field] ?? '').trim()]),
  ) as unknown as WalletInput
}

function favoritesFailure() {
  return errorResponse(500, 'FAVORITES_UNAVAILABLE', 'Não foi possível atualizar os favoritos agora. Tente novamente.')
}

function walletsOf(userId: string) {
  db.wallets[userId] ??= []
  return db.wallets[userId]
}

export const accountHandlers: HttpHandler[] = [
  http.put(api('/me/profile'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const body = await readJson<ProfileInput>(request)
    const invalid = validationError(validateProfile(body))
    if (invalid) return invalid

    const email = body.email!.trim().toLowerCase()
    const username = body.username!.trim()
    const others = db.users.filter((user) => user.id !== viewer.user.id)
    const fieldErrors: Record<string, string> = {}
    if (others.some((user) => user.email.toLowerCase() === email)) {
      fieldErrors.email = 'Já existe uma conta com este e-mail.'
    }
    if (others.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      fieldErrors.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fieldErrors).length > 0) {
      return errorResponse(409, 'ACCOUNT_EXISTS', 'Revise os campos destacados.', fieldErrors)
    }

    Object.assign(viewer.user, {
      displayName: body.displayName!.trim(),
      username,
      email,
      ensName: body.ensName!.trim(),
      walletNickname: body.walletNickname!.trim(),
    })
    commit()
    return HttpResponse.json(publicUser(viewer.user))
  }),

  http.put(api('/me/password'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const body = await readJson<PasswordChangeInput>(request)
    const invalid = validationError(
      validatePasswordChange({ ...body, confirmPassword: body.newPassword }),
    )
    if (invalid) return invalid
    if (!(await verifyPassword(body.currentPassword!, viewer.user.passwordHash))) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
        currentPassword: 'Senha atual incorreta.',
      })
    }
    viewer.user.passwordHash = await hashPassword(body.newPassword!)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.put(api('/me/avatar'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const { dataUrl } = await readJson<{ dataUrl: string }>(request)
    const mimeType = dataUrl?.match(/^data:([^;]+);base64,/)?.[1]
    if (!dataUrl || !mimeType || !AVATAR_TYPES.includes(mimeType)) {
      return errorResponse(415, 'AVATAR_TYPE', 'Envie uma imagem PNG, JPG ou WEBP.')
    }
    if (dataUrl.length > AVATAR_MAX_DATA_URL_LENGTH) {
      return errorResponse(413, 'AVATAR_TOO_LARGE', 'A imagem deve ter no máximo 1 MB.')
    }
    viewer.user.avatarUrl = dataUrl
    commit()
    return HttpResponse.json(publicUser(viewer.user))
  }),

  http.delete(api('/me/avatar'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    viewer.user.avatarUrl = null
    commit()
    return HttpResponse.json(publicUser(viewer.user))
  }),

  http.get(api('/me/wallets'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    return HttpResponse.json(walletsOf(viewer.user.id))
  }),

  http.post(api('/me/wallets'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const body = await readJson<WalletInput & { role: WalletRole }>(request)
    const invalid = validationError(validateWallet(body))
    if (invalid) return invalid
    const role: WalletRole = body.role === 'secondary' ? 'secondary' : 'primary'
    const wallets = walletsOf(viewer.user.id)
    if (wallets.some((wallet) => wallet.role === role)) {
      return errorResponse(
        409,
        'WALLET_EXISTS',
        role === 'primary'
          ? 'Você já tem uma carteira principal. Edite-a em vez de adicionar outra.'
          : 'Você já tem uma carteira secundária.',
      )
    }
    const wallet: Wallet = {
      ...pickWallet(body),
      id: createId('wallet'),
      role,
      createdAt: new Date().toISOString(),
    }
    wallets.push(wallet)
    commit()
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.put(api('/me/wallets/:id'), async ({ request, params }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const wallet = walletsOf(viewer.user.id).find((item) => item.id === params.id)
    if (!wallet) return errorResponse(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada.')
    const body = await readJson<WalletInput>(request)
    const invalid = validationError(validateWallet(body))
    if (invalid) return invalid
    Object.assign(wallet, pickWallet(body))
    commit()
    return HttpResponse.json(wallet)
  }),

  http.delete(api('/me/wallets/:id'), async ({ request, params }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const wallets = walletsOf(viewer.user.id)
    const index = wallets.findIndex((item) => item.id === params.id)
    if (index === -1) return errorResponse(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada.')
    wallets.splice(index, 1)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('/me/wallet-connection'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    return HttpResponse.json(db.walletConnections[viewer.user.id] ?? null)
  }),

  http.post(api('/me/wallet-connection'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const body = await readJson<{ provider: string }>(request)
    const provider = WALLET_PROVIDERS.find((item) => item.id === body.provider)
    if (!provider) return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma carteira.')

    await delay(isScenarioActive('no-latency') ? 0 : WALLET_APPROVAL_MS)
    if (isScenarioActive('wallet-rejected')) {
      return errorResponse(403, 'WALLET_REJECTED', `A conexão foi recusada na carteira ${provider.label}.`)
    }
    // The wallet exposes the collector's primary account, like an extension would.
    const primary = walletsOf(viewer.user.id).find((wallet) => wallet.role === 'primary')
    const connection: WalletConnection = {
      provider: provider.id,
      address: primary?.address ?? randomHex(20),
      connectedAt: new Date().toISOString(),
    }
    db.walletConnections[viewer.user.id] = connection
    commit()
    return HttpResponse.json(connection)
  }),

  http.delete(api('/me/wallet-connection'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    delete db.walletConnections[viewer.user.id]
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('/me/favorites'), async ({ request }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    const ids = db.favorites[viewer.user.id] ?? []
    const items = ids.map(findNft).filter((record) => record !== undefined).map(toNft)
    return HttpResponse.json(items)
  }),

  http.put(api('/me/favorites/:nftId'), async ({ request, params }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    if (isScenarioActive('favorites-failure')) return favoritesFailure()
    const nftId = String(params.nftId)
    if (!findNft(nftId)) return errorResponse(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    const favorites = (db.favorites[viewer.user.id] ??= [])
    if (!favorites.includes(nftId)) favorites.unshift(nftId)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(api('/me/favorites/:nftId'), async ({ request, params }) => {
    await latency()
    const viewer = requireUser(request)
    if (viewer instanceof Response) return viewer
    if (isScenarioActive('favorites-failure')) return favoritesFailure()
    db.favorites[viewer.user.id] = (db.favorites[viewer.user.id] ?? []).filter(
      (id) => id !== params.nftId,
    )
    commit()
    return new HttpResponse(null, { status: 204 })
  }),
]
