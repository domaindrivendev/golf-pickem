import { NextRequest, NextResponse } from 'next/server'
import { clearCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/auth/signin', request.url))
  response.cookies.set(clearCookieOptions())
  return response
}
