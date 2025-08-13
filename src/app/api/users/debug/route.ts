import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    console.log('🔍 Debugging user state for:', user.id);

    // Create authenticated client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Check auth user details
    const authUserInfo = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    };

    // Check if user exists in users table
    const { data: dbUser, error: userError } = await authenticatedSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check if profile exists
    const { data: profile, error: profileError } = await authenticatedSupabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Check seminars owned by this user
    const { data: ownedSeminars, error: seminarsError } = await authenticatedSupabase
      .from('seminars')
      .select('id, title, owner_id')
      .eq('owner_id', user.id);

    return NextResponse.json({
      debug_info: {
        auth_user: authUserInfo,
        db_user: {
          exists: !userError,
          data: dbUser,
          error: userError?.message
        },
        profile: {
          exists: !profileError,
          data: profile,
          error: profileError?.message
        },
        owned_seminars: {
          count: ownedSeminars?.length || 0,
          data: ownedSeminars,
          error: seminarsError?.message
        },
        extracted_name: user.user_metadata?.name || 
                       user.user_metadata?.full_name || 
                       user.email?.split('@')[0] || 
                       'Unknown',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 