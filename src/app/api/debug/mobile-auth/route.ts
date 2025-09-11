import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Get all cookies from the request
    const cookies = request.cookies.getAll();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('sb-') || 
      cookie.name.includes('auth') ||
      cookie.name.includes('supabase')
    );

    // Get user agent for mobile detection
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Get session information
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    const debugInfo = {
      timestamp: new Date().toISOString(),
      isMobile,
      userAgent,
      authStatus: {
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id || null,
        userEmail: user?.email || null,
        authError: authError?.message || null,
        sessionError: sessionError?.message || null,
        sessionExpiresAt: session?.expires_at || null,
      },
      cookies: {
        total: cookies.length,
        authCookies: authCookies.length,
        authCookieNames: authCookies.map(c => c.name),
        allCookieNames: cookies.map(c => c.name),
      },
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        protocol: request.nextUrl.protocol,
      }
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendations: getMobileAuthRecommendations(debugInfo)
    });

  } catch (error) {
    console.error('Mobile auth debug error:', error);
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

function getMobileAuthRecommendations(debugInfo: any): string[] {
  const recommendations = [];

  if (debugInfo.isMobile && !debugInfo.authStatus.hasUser) {
    recommendations.push('Mobile device detected with no authenticated user - check cookie storage');
  }

  if (debugInfo.cookies.authCookies === 0) {
    recommendations.push('No authentication cookies found - user may need to re-login');
  }

  if (debugInfo.authStatus.hasSession && !debugInfo.authStatus.hasUser) {
    recommendations.push('Session exists but no user - possible token refresh issue');
  }

  if (debugInfo.headers.protocol === 'http:' && debugInfo.isMobile) {
    recommendations.push('Using HTTP on mobile - secure cookies may not work properly');
  }

  if (debugInfo.authStatus.authError) {
    recommendations.push(`Auth error detected: ${debugInfo.authStatus.authError}`);
  }

  return recommendations;
} 