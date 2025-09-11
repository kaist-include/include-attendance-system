import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const seminarId = searchParams.get('seminarId');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // If seminarId is provided, check if user can manage that seminar
    if (seminarId) {
      const { data: seminar, error: seminarError } = await supabase
        .from('seminars')
        .select('owner_id')
        .eq('id', seminarId)
        .single();

      if (seminarError || !seminar) {
        return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
      }

      // Check permissions
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isOwner = seminar.owner_id === user.id;
      const isAdmin = userRecord?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    // Search users by name or email
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('id, name, email')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', user.id) // Exclude current user
      .limit(10);

    if (searchError) {
      console.error('Error searching users:', searchError);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // If seminarId is provided, exclude users who already have permissions and the seminar owner
    if (seminarId) {
      const { data: seminar } = await supabase
        .from('seminars')
        .select('owner_id')
        .eq('id', seminarId)
        .single();

      const { data: existingPermissions } = await supabase
        .from('seminar_permissions')
        .select('user_id')
        .eq('seminar_id', seminarId);

      const excludedUserIds = new Set([
        seminar?.owner_id,
        ...(existingPermissions?.map(p => p.user_id) || [])
      ]);

      const filteredUsers = users?.filter(u => !excludedUserIds.has(u.id)) || [];
      return NextResponse.json(filteredUsers);
    }

    return NextResponse.json(users || []);

  } catch (error) {
    console.error('Error in user search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 