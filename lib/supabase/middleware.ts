import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/login'])
const PUBLIC_PREFIXES = ['/auth/callback']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options)
  })
  return to
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    return copyResponseCookies(supabaseResponse, NextResponse.redirect(redirectUrl))
  }

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return copyResponseCookies(
        supabaseResponse,
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('message', 'Please log in to continue')
    redirectUrl.searchParams.set('next', `${pathname}${search}`)
    return copyResponseCookies(supabaseResponse, NextResponse.redirect(redirectUrl))
  }

  return supabaseResponse
}
