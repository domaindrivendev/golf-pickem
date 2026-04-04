import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth'

export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value
  const session = token ? await verifyJwt(token) : null

  // Redirect authenticated users away from sign-in
  if (pathname.startsWith('/auth/signin')) {
    if (session) {
      return NextResponse.redirect(new URL(session.role === 'admin' ? '/admin' : '/picks', request.url))
    }
    return NextResponse.next()
  }

  // Protect /admin and /picks
  if (pathname.startsWith('/admin') || pathname.startsWith('/picks')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
    if (pathname.startsWith('/admin') && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/picks', request.url))
    }
    if (pathname.startsWith('/picks') && session.role !== 'participant') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/auth/signin', '/admin/:path*', '/picks/:path*'],
}
