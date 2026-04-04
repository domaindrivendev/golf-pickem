import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MagicToken } from '@/lib/storage'

// Mock storage so tests don't touch the filesystem
vi.mock('@/lib/storage', () => ({
  readTokens: vi.fn(),
  writeTokens: vi.fn(),
}))

// Mock fs.appendFileSync and fs.mkdirSync used by sendMagicLink
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return { ...actual, appendFileSync: vi.fn(), mkdirSync: vi.fn() }
})

import { generateToken, createMagicToken, consumeMagicToken } from '@/lib/magic-link'
import { readTokens, writeTokens } from '@/lib/storage'

const mockReadTokens = vi.mocked(readTokens)
const mockWriteTokens = vi.mocked(writeTokens)

beforeEach(() => {
  vi.clearAllMocks()
  mockWriteTokens.mockResolvedValue(undefined)
})

describe('generateToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateToken()))
    expect(tokens.size).toBe(20)
  })
})

describe('createMagicToken', () => {
  it('stores a token record and returns the token', async () => {
    mockReadTokens.mockResolvedValue([])

    const token = await createMagicToken('user@example.com')

    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(mockWriteTokens).toHaveBeenCalledOnce()

    const written: MagicToken[] = mockWriteTokens.mock.calls[0][0]
    expect(written).toHaveLength(1)
    expect(written[0].email).toBe('user@example.com')
    expect(written[0].used).toBe(false)
    expect(new Date(written[0].expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('appends to existing tokens', async () => {
    const existing: MagicToken = {
      token: 'old-token',
      email: 'other@example.com',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      used: false,
    }
    mockReadTokens.mockResolvedValue([existing])

    await createMagicToken('new@example.com')

    const written: MagicToken[] = mockWriteTokens.mock.calls[0][0]
    expect(written).toHaveLength(2)
    expect(written[0].token).toBe('old-token')
  })
})

describe('consumeMagicToken', () => {
  it('returns the email and marks token as used', async () => {
    const token = generateToken()
    const record: MagicToken = {
      token,
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      used: false,
    }
    mockReadTokens.mockResolvedValue([record])

    const email = await consumeMagicToken(token)

    expect(email).toBe('user@example.com')
    const written: MagicToken[] = mockWriteTokens.mock.calls[0][0]
    expect(written[0].used).toBe(true)
  })

  it('returns null for an unknown token', async () => {
    mockReadTokens.mockResolvedValue([])
    expect(await consumeMagicToken('unknown')).toBeNull()
  })

  it('returns null for an already-used token', async () => {
    const token = generateToken()
    mockReadTokens.mockResolvedValue([{
      token,
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      used: true,
    }])
    expect(await consumeMagicToken(token)).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const token = generateToken()
    mockReadTokens.mockResolvedValue([{
      token,
      email: 'user@example.com',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      used: false,
    }])
    expect(await consumeMagicToken(token)).toBeNull()
  })
})
