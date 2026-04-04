import { NextRequest, NextResponse } from 'next/server'
import { consumeMagicToken } from '@/lib/magic-link'
import { findUserByEmail } from '@/lib/users'
import { signJwt, sessionCookieOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing-token', request.url))
  }

  const email = await consumeMagicToken(token)
  if (!email) {
    return NextResponse.redirect(new URL('/auth/signin?error=invalid-token', request.url))
  }

  const user = await findUserByEmail(email)
  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin?error=user-not-found', request.url))
  }

  const jwt = await signJwt({ sub: user.id, email: user.email, role: user.role })
  const destination = user.role === 'admin' ? '/admin' : '/picks'
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.cookies.set(sessionCookieOptions(jwt))

  return response
}
