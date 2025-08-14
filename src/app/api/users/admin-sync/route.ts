import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, name, email } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('🚀 Admin sync for user:', userId);

    // Use service client to bypass all RLS policies
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate fallback name and email
    const finalName = name || email?.split('@')[0] || `User ${userId.slice(0, 8)}`;
    const finalEmail = email || `${userId}@example.com`;

    console.log('📝 Creating user with data:', {
      id: userId,
      email: finalEmail,
      name: finalName,
      role: 'member'
    });

    // Delete existing user record if it exists
    await serviceSupabase
      .from('users')
      .delete()
      .eq('id', userId);

    // Create fresh user record
    const { data: newUser, error: createUserError } = await serviceSupabase
      .from('users')
      .insert({
        id: userId,
        email: finalEmail,
        name: finalName,
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

    // Also create profile
    await serviceSupabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    const { data: newProfile, error: createProfileError } = await serviceSupabase
      .from('profiles')
      .insert({
        user_id: userId,
        nickname: finalName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return NextResponse.json({
      message: 'User admin-synced successfully',
      user: newUser,
      profile: newProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 