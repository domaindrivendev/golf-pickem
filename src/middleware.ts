import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth'

export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value
  const session = token ? await verifyJwt(token) : null

  // Redirect authenticated admins away from sign-in
  if (pathname.startsWith('/auth/signin')) {
    if (session?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Protect /admin — must be a signed-in admin
  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/auth/signin', '/admin/:path*'],
}
