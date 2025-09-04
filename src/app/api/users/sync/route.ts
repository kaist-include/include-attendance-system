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

    console.log('🔑 Using authenticated Supabase client with RLS');

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabase
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

    // Create user record
    console.log('📝 Attempting to create user with data:', {
      id: user.id,
      email: email,
      name: name,
      role: 'member'
    });

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: email,
        name: name,
        role: 'member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create user:', createError);
      
      // If user creation failed due to RLS, they might need admin assistance
      if (createError.code === '42501') {
        return NextResponse.json({ 
          error: 'User creation requires admin assistance',
          details: 'Please contact an administrator to create your user record'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create user record',
        details: createError.message,
        code: createError.code
      }, { status: 500 });
    }

    console.log('✅ Created user record:', newUser);

    // Also check/create profile record if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('⚠️ Profile creation failed, but user created successfully:', profileError);
      } else {
        console.log('✅ Created profile record');
      }
    }

    console.log('🎉 User sync completed successfully');

    return NextResponse.json({
      message: 'User sync completed successfully',
      user: newUser,
      operation: 'created'
    });

  } catch (error) {
    console.error('❌ User Sync API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 