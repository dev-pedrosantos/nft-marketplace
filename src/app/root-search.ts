export const AUTH_VIEWS = ['login', 'signup'] as const
export type AuthView = (typeof AUTH_VIEWS)[number]

/** Search params understood on every route: they drive the auth dialog. */
export interface RootSearch {
  auth?: AuthView
  /** Internal path to open after signing in. */
  redirect?: string
}

/** Only same-origin paths are accepted, so `redirect` can't send users elsewhere. */
export function safeRedirect(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}

export function parseRootSearch(search: Record<string, unknown>): RootSearch {
  return {
    auth: AUTH_VIEWS.includes(search.auth as AuthView) ? (search.auth as AuthView) : undefined,
    redirect: safeRedirect(search.redirect),
  }
}
