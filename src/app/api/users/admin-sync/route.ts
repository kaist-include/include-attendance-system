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

    // Check if user is admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, name, email } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('🚀 Admin sync for user:', userId);

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
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    // Create fresh user record
    const { data: newUser, error: createUserError } = await supabase
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
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: finalName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createProfileError) {
      console.warn('⚠️ Failed to create profile, but user created successfully:', createProfileError);
    } else {
      console.log('✅ Created profile record:', newProfile);
    }

    return NextResponse.json({
      message: 'Admin sync completed successfully',
      user: newUser,
      profile: newProfile || null
    });

  } catch (error) {
    console.error('❌ Admin Sync API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 