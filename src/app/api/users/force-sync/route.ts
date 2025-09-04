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

    console.log('🚀 Force syncing user:', user.id);

    // Check if user is admin (required for force sync)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Extract user info
    const email = user.email || '';
    const name = user.user_metadata?.name || 
                 user.user_metadata?.full_name || 
                 user.user_metadata?.display_name ||
                 email.split('@')[0] || 
                 'Unknown User';

    console.log('📊 User info:', { id: user.id, email, name });

    // First, check if user record already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
    }

    let userRecord;
    
    if (existingUser) {
      // Update existing user
      console.log('📝 Updating existing user record');
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email: email,
          name: name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update user:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update user record',
          details: updateError.message
        }, { status: 500 });
      }

      userRecord = updatedUser;
      console.log('✅ Updated user record:', userRecord);
    } else {
      // Create new user record
      console.log('📝 Creating new user record');
      const { data: newUser, error: insertError } = await supabase
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

      if (insertError) {
        console.error('❌ Failed to create user:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create user record',
          details: insertError.message
        }, { status: 500 });
      }

      userRecord = newUser;
      console.log('✅ Created user record:', userRecord);
    }

    console.log('🎉 Force sync completed successfully');

    return NextResponse.json({
      message: 'User force sync completed successfully',
      user: userRecord,
      operation: existingUser ? 'updated' : 'created'
    });

  } catch (error) {
    console.error('❌ Force Sync API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 