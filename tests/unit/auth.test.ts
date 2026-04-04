import { describe, it, expect, vi } from 'vitest'

// Mock next/headers so auth.ts can be imported outside Next.js
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
}))

import { signJwt, verifyJwt, sessionCookieOptions, clearCookieOptions } from '@/lib/auth'

describe('signJwt / verifyJwt', () => {
  it('round-trips a payload', async () => {
    const payload = { sub: 'user-1', email: 'a@b.com', role: 'admin' as const }
    const token = await signJwt(payload)
    const decoded = await verifyJwt(token)

    expect(decoded?.sub).toBe(payload.sub)
    expect(decoded?.email).toBe(payload.email)
    expect(decoded?.role).toBe(payload.role)
  })

  it('returns null for a tampered token', async () => {
    const token = await signJwt({ sub: 'u1', email: 'x@x.com', role: 'participant' })
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(await verifyJwt(tampered)).toBeNull()
  })

  it('returns null for a garbage string', async () => {
    expect(await verifyJwt('not-a-jwt')).toBeNull()
  })
})

describe('sessionCookieOptions', () => {
  it('sets the expected cookie fields', () => {
    const opts = sessionCookieOptions('my-token')
    expect(opts.name).toBe('session')
    expect(opts.value).toBe('my-token')
    expect(opts.httpOnly).toBe(true)
    expect(opts.sameSite).toBe('lax')
    expect(opts.maxAge).toBeGreaterThan(0)
  })
})

describe('clearCookieOptions', () => {
  it('sets maxAge to 0', () => {
    const opts = clearCookieOptions()
    expect(opts.name).toBe('session')
    expect(opts.value).toBe('')
    expect(opts.maxAge).toBe(0)
  })
})
