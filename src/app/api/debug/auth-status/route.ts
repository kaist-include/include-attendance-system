import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get session information
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    const debugInfo = {
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
      sessionExists: !!session,
      userExists: !!user,
      sessionError: sessionError?.message || null,
      userError: userError?.message || null,
      userEmail: user?.email || null,
      userId: user?.id || null,
      sessionExpiresAt: session?.expires_at || null,
      cookies: {
        total: request.cookies.getAll().length,
        authCookies: request.cookies.getAll().filter(cookie => 
          cookie.name.includes('sb-') || cookie.name.includes('auth')
        ).map(c => ({ name: c.name, hasValue: !!c.value }))
      }
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      isAuthenticated: !!(session && user && !sessionError && !userError),
      recommendations: getAuthRecommendations(debugInfo)
    });

  } catch (error) {
    console.error('Auth status debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        errorType: 'debug_failure'
      }
    }, { status: 500 });
  }
}

function getAuthRecommendations(debugInfo: any): string[] {
  const recommendations = [];

  if (!debugInfo.sessionExists && !debugInfo.userExists) {
    recommendations.push('No session or user found - user needs to log in');
  }

  if (debugInfo.sessionExists && !debugInfo.userExists) {
    recommendations.push('Session exists but no user - possible token issue');
  }

  if (!debugInfo.sessionExists && debugInfo.userExists) {
    recommendations.push('User exists but no session - unusual state');
  }

  if (debugInfo.sessionError) {
    recommendations.push(`Session error: ${debugInfo.sessionError}`);
  }

  if (debugInfo.userError) {
    recommendations.push(`User error: ${debugInfo.userError}`);
  }

  if (debugInfo.cookies.authCookies.length === 0) {
    recommendations.push('No authentication cookies found - check cookie settings');
  }

  if (debugInfo.sessionExpiresAt) {
    const expiresAt = new Date(debugInfo.sessionExpiresAt);
    const now = new Date();
    if (expiresAt < now) {
      recommendations.push('Session has expired - user needs to log in again');
    }
  }

  return recommendations;
} 