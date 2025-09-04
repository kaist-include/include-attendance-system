import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🔄 Syncing user to users table:', user.id);
    console.log('📊 User metadata:', {
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    });

    // Use authenticated client - RLS will handle permissions
    const authenticatedSupabase = supabase;

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