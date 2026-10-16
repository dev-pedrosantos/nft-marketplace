export interface User {
  id: string
  email: string
  username: string
  displayName: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
}

export interface Session {
  token: string
  /** ISO timestamp; the API rejects the token with `SESSION_EXPIRED` after it. */
  expiresAt: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}
