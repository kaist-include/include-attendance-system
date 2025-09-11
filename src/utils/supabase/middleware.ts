import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options = {} }) => {
            // Enhanced mobile-friendly cookie options
            const enhancedOptions: CookieOptions = {
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7 days
              sameSite: 'lax',
              secure: request.nextUrl.protocol === 'https:',
              httpOnly: false, // Must be false for client-side access
              ...options
            }
            
            request.cookies.set(name, value)
          })
          
          supabaseResponse = NextResponse.next({
            request,
          })
          
          cookiesToSet.forEach(({ name, value, options = {} }) => {
            // Enhanced mobile-friendly cookie options for response
            const enhancedOptions: CookieOptions = {
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7 days
              sameSite: 'lax',
              secure: request.nextUrl.protocol === 'https:',
              httpOnly: false, // Must be false for client-side access
              ...options
            }
            
            supabaseResponse.cookies.set(name, value, enhancedOptions)
          })
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log(`Middleware: ${request.nextUrl.pathname}, User: ${user ? user.email : 'None'}`);
  
  // Additional debugging for login flow
  if (request.nextUrl.pathname === '/dashboard') {
    console.log('Middleware: Dashboard access attempt');
    console.log('Middleware: User object:', user ? { id: user.id, email: user.email } : 'null');
    
    // Check cookies for debugging
    const authCookies = request.cookies.getAll().filter(cookie => 
      cookie.name.includes('sb-') || cookie.name.includes('auth')
    );
    console.log(`Middleware: Found ${authCookies.length} auth cookies:`, authCookies.map(c => c.name));
  }

  // Auth redirects for protected routes - redirect to login if not authenticated
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/register') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/' // Allow access to home page
  ) {
    console.log(`Middleware: Redirecting ${request.nextUrl.pathname} to /login - no user found`);
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Log successful authentication
  if (user) {
    console.log(`Middleware: User ${user.email} accessing ${request.nextUrl.pathname} - access granted`);
  } else {
    console.log(`Middleware: Allowing unauthenticated access to ${request.nextUrl.pathname}`);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
} 