/**
 * Password storage of the simulated backend: PBKDF2-SHA256 with a random salt per user,
 * stored as `pbkdf2-sha256$<iterations>$<salt>$<hash>` (base64).
 */
const ALGORITHM = 'pbkdf2-sha256'
const ITERATIONS = 100_000
const SALT_BYTES = 16
const HASH_BITS = 256

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BITS)
  return new Uint8Array(bits)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, ITERATIONS)
  return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(hash)].join('$')
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterations, salt, hash] = stored.split('$')
  if (algorithm !== ALGORITHM || !iterations || !salt || !hash) return false
  const expected = fromBase64(hash)
  const actual = await derive(password, fromBase64(salt), Number(iterations))
  // Compares every byte, so the time taken does not reveal where a mismatch is.
  let difference = expected.length ^ actual.length
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index]
  return difference === 0
}
