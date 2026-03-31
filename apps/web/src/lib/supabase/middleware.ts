import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectRes = NextResponse.redirect(url);
    // Copy any refreshed session cookies so they are not lost on redirect
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
      redirectRes.cookies.set(name, value, rest);
    });
    return redirectRes;
  }

  // Redirect authenticated users from login to correct dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/employee/dashboard';
    const redirectRes = NextResponse.redirect(url);
    // Copy refreshed session cookies — CRITICAL: without this the new token is lost
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
      redirectRes.cookies.set(name, value, rest);
    });
    return redirectRes;
  }

  return supabaseResponse;
}
