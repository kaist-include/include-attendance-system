import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
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

    console.log('🔄 Syncing user to users table:', user.id);
    console.log('📊 User metadata:', {
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    });

    // Create both authenticated client and service client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Service client for bypassing RLS
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔑 Using both authenticated and service Supabase clients');

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await authenticatedSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      console.log('✅ User already exists in users table');
      return NextResponse.json({ 
        message: 'User already exists',
        user: existingUser 
      });
    }

    console.log('📝 Creating user record in users table');

    // Extract user info
    const email = user.email || '';
    const name = user.user_metadata?.name || 
                 user.user_metadata?.full_name || 
                 email.split('@')[0] || 
                 'User';

    // Create user record using service client to bypass RLS
    console.log('📝 Attempting to create user with data:', {
      id: user.id,
      email: email,
      name: name,
      role: 'member'
    });

    const { data: newUser, error: createError } = await serviceSupabase
      .from('users')
      .insert({
        id: user.id,
        email: email,
        name: name,
        role: 'member'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating user:', createError);
      return NextResponse.json({ 
        error: 'Failed to create user record',
        details: createError.message 
      }, { status: 500 });
    }

    console.log('✅ User created successfully:', newUser);

    // Also create profile if it doesn't exist
    const { data: existingProfile } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      console.log('📝 Creating profile record');
      
      const { error: profileError } = await serviceSupabase
        .from('profiles')
        .insert({
          user_id: user.id,
          nickname: name
        });

      if (profileError) {
        console.error('⚠️ Error creating profile (non-critical):', profileError);
      } else {
        console.log('✅ Profile created successfully');
      }
    }

    return NextResponse.json({
      message: 'User synced successfully',
      user: newUser
    });

  } catch (error) {
    console.error('❌ User sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 