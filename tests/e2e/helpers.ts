import fs from 'fs'
import path from 'path'

const EMAILS_FILE = path.join(process.cwd(), 'tmp', 'emails.txt')
const TOKENS_FILE = path.join(process.cwd(), 'data', 'magic-tokens.json')

/** Poll the emails file until a magic link for the given email appears. */
export async function getMagicLink(email: string, timeoutMs = 5000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (fs.existsSync(EMAILS_FILE)) {
      const content = fs.readFileSync(EMAILS_FILE, 'utf-8')
      const entries = content.split('--- Magic Link Email ---').filter(Boolean).reverse()
      for (const entry of entries) {
        if (entry.includes(`To: ${email}`)) {
          const match = entry.match(/Link: (http\S+)/)
          if (match) return match[1]
        }
      }
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`No magic link found for ${email} within ${timeoutMs}ms`)
}

/** Clear tokens and emails between tests for isolation. */
export function resetState() {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify([], null, 2))
  fs.writeFileSync(EMAILS_FILE, '')
}
