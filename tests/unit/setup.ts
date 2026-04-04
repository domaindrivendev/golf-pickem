import { webcrypto } from 'crypto'

// jose uses the Web Crypto API; expose it as a global for Node 18
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
