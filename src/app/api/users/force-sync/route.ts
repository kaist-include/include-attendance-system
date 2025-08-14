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

    console.log('🚀 Force syncing user:', user.id);

    // Use service client to bypass all RLS policies
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user info
    const email = user.email || '';
    const name = user.user_metadata?.name || 
                 user.user_metadata?.full_name || 
                 user.user_metadata?.display_name ||
                 email.split('@')[0] || 
                 'User';

    console.log('📋 Extracted user info:', { id: user.id, email, name });

    // Delete existing user record if it exists (to start fresh)
    const { error: deleteUserError } = await serviceSupabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteUserError) {
      console.log('⚠️ No existing user record to delete (this is fine)');
    } else {
      console.log('🗑️ Deleted existing user record');
    }

    // Delete existing profile record if it exists
    const { error: deleteProfileError } = await serviceSupabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id);

    if (deleteProfileError) {
      console.log('⚠️ No existing profile record to delete (this is fine)');
    } else {
      console.log('🗑️ Deleted existing profile record');
    }

    // Create fresh user record
    const { data: newUser, error: createUserError } = await serviceSupabase
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

    if (createUserError) {
      console.error('❌ Failed to create user:', createUserError);
      return NextResponse.json({ 
        error: 'Failed to create user record',
        details: createUserError.message,
        code: createUserError.code
      }, { status: 500 });
    }

    console.log('✅ Created user record:', newUser);

    // Create fresh profile record
    const { data: newProfile, error: createProfileError } = await serviceSupabase
      .from('profiles')
      .insert({
        user_id: user.id,
        nickname: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createProfileError) {
      console.error('❌ Failed to create profile:', createProfileError);
      // Don't fail the whole operation for profile creation
    } else {
      console.log('✅ Created profile record:', newProfile);
    }

    return NextResponse.json({
      message: 'User force-synced successfully',
      user: newUser,
      profile: newProfile,
      extracted_name: name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Force sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 