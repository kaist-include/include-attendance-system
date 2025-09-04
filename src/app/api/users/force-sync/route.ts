import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🚀 Force syncing user:', user.id);

    // Use service client to bypass all RLS policies (only when needed)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Extract user info
    const email = user.email || '';
    const name = user.user_metadata?.name || 
                 user.user_metadata?.full_name || 
                 user.user_metadata?.display_name ||
                 email.split('@')[0] || 
                 'Unknown User';

    console.log('📊 User info:', { id: user.id, email, name });

    // First, check if user record already exists
    const { data: existingUser, error: checkError } = await serviceSupabase
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
      const { data: updatedUser, error: updateError } = await serviceSupabase
        .from('users')
        .update({
          email,
          name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      userRecord = updatedUser;
      console.log('✅ User record updated');
    } else {
      // Create new user record
      console.log('➕ Creating new user record');
      const { data: newUser, error: insertError } = await serviceSupabase
      .from('users')
      .insert({
        id: user.id,
          email,
          name,
          role: 'student', // Default role
        created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
      })
      .select()
      .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

      userRecord = newUser;
      console.log('✅ User record created');
    }

    console.log('🎯 Force sync completed successfully');

    return NextResponse.json({
      message: 'User sync completed successfully',
      user: userRecord,
      action: existingUser ? 'updated' : 'created'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 