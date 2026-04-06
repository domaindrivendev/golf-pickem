import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword } from '@/lib/users'
import { signJwt, sessionCookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await verifyAdminPassword(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const token = await signJwt({ sub: user.id, email: user.email, role: 'admin' })
  const res = NextResponse.json({ ok: true })
  const opts = sessionCookieOptions(token)
  res.cookies.set(opts)
  return res
}
