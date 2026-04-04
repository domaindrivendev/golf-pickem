import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateUser } from '@/lib/users'
import { createMagicToken, sendMagicLink } from '@/lib/magic-link'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    await findOrCreateUser(email)
    const token = await createMagicToken(email)
    sendMagicLink(email, token)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[magic-link] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
