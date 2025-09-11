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

    console.log('🔄 Quick user sync for:', user.id);

    // Extract user info early
    const email = user.email || '';
    const name = user.user_metadata?.name || 
                 user.user_metadata?.full_name || 
                 email.split('@')[0] || 
                 'User';

    // Try to upsert (insert or update) user in one operation
    const { data: upsertedUser, error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: email,
        name: name,
        role: 'member',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error('❌ User upsert failed:', upsertError);
      
      // If upsert failed due to RLS, return the error
      if (upsertError.code === '42501') {
        return NextResponse.json({ 
          error: 'User creation requires admin assistance',
          details: 'Please contact an administrator to create your user record'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to sync user record',
        details: upsertError.message,
        code: upsertError.code
      }, { status: 500 });
    }

    console.log('✅ User upserted successfully:', upsertedUser);

    // Try to upsert profile in parallel (non-blocking)
    supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: name,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .then(({ error: profileError }) => {
        if (profileError) {
          console.warn('⚠️ Profile upsert failed:', profileError);
        } else {
          console.log('✅ Profile upserted successfully');
        }
      });

    console.log('🎉 User sync completed successfully');

    return NextResponse.json({
      message: 'User sync completed successfully',
      user: upsertedUser,
      operation: upsertedUser ? 'upserted' : 'existing'
    });

  } catch (error) {
    console.error('❌ User Sync API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 