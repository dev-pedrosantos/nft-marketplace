/**
 * Stand-in for `tough-cookie`, which MSW only uses to keep cookies set by mocked responses.
 * The mock API authenticates with a bearer token and never sends `Set-Cookie`, while the real
 * package (with the public suffix list from `tldts`) was about 40% of the MSW chunk.
 * Cookies from `document.cookie` and request headers still reach handlers through MSW itself.
 */
interface StoredCookie {
  key: string
  value: string
  toString(): string
  toJSON(): unknown
}

export class MemoryCookieStore {
  idx: Record<string, Record<string, Record<string, StoredCookie>>> = {}
}

export class CookieJar {
  getCookiesSync(): StoredCookie[] {
    return []
  }

  async setCookie(): Promise<void> {}
}

export const Cookie = {
  fromJSON(): StoredCookie | null {
    return null
  },
}
