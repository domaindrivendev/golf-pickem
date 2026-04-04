import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { readTokens, writeTokens, type MagicToken } from './storage'

const TOKEN_TTL_MINUTES = 15
const EMAIL_LOG = path.join(process.cwd(), 'tmp', 'emails.txt')

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createMagicToken(email: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString()

  const tokens = await readTokens()
  const record: MagicToken = { token, email, expiresAt, used: false }
  tokens.push(record)
  await writeTokens(tokens)

  return token
}

export async function consumeMagicToken(token: string): Promise<string | null> {
  const tokens = await readTokens()
  const idx = tokens.findIndex((t) => t.token === token)
  if (idx === -1) return null

  const record = tokens[idx]
  if (record.used) return null
  if (new Date(record.expiresAt) < new Date()) return null

  tokens[idx] = { ...record, used: true }
  await writeTokens(tokens)

  return record.email
}

export function sendMagicLink(email: string, token: string): void {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/auth/verify?token=${token}`
  const entry = [
    '--- Magic Link Email ---',
    `To: ${email}`,
    `Link: ${link}`,
    `Sent: ${new Date().toISOString()}`,
    '',
  ].join('\n')

  fs.mkdirSync(path.dirname(EMAIL_LOG), { recursive: true })
  fs.appendFileSync(EMAIL_LOG, entry + '\n')
  console.log(`[magic-link] Email written to ${EMAIL_LOG}`)
  console.log(`[magic-link] Link: ${link}`)
}
