import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendSeminarPermissionGrantedNotification } from '@/lib/notifications';

// GET - Fetch all permissions for a seminar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user can manage this seminar
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id, title')
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

    // Fetch permissions with user details
    const { data: permissions, error: permissionsError } = await supabase
      .from('seminar_permissions')
      .select(`
        id,
        role,
        created_at,
        user_id,
        granted_by,
        users!seminar_permissions_user_id_fkey(
          id,
          name,
          email
        )
      `)
      .eq('seminar_id', seminarId)
      .order('created_at', { ascending: false });

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError);
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }

    return NextResponse.json(permissions || []);

  } catch (error) {
    console.error('Error in permissions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new permission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    const { userId, role } = await request.json();
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['assistant', 'moderator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user can manage this seminar
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id, title')
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

    // Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent adding permission to seminar owner
    if (userId === seminar.owner_id) {
      return NextResponse.json({ error: 'Cannot assign permissions to seminar owner' }, { status: 400 });
    }

    // Insert permission (upsert to handle duplicates)
    const { data: permission, error: insertError } = await supabase
      .from('seminar_permissions')
      .upsert(
        {
          seminar_id: seminarId,
          user_id: userId,
          role,
          granted_by: user.id
        },
        {
          onConflict: 'seminar_id,user_id'
        }
      )
      .select(`
        id,
        role,
        created_at,
        user_id,
        users!seminar_permissions_user_id_fkey(
          id,
          name,
          email
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting permission:', insertError);
      return NextResponse.json({ error: 'Failed to add permission' }, { status: 500 });
    }

    // Send notification to user about permission grant
    try {
      await sendSeminarPermissionGrantedNotification(
        userId,
        seminar.title,
        seminarId,
        role
      );
    } catch (notificationError) {
      console.error('Failed to send permission grant notification:', notificationError);
      // Don't fail the permission grant if notification fails
    }

    return NextResponse.json(permission);

  } catch (error) {
    console.error('Error in permissions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a permission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permissionId');
    
    if (!permissionId) {
      return NextResponse.json({ error: 'Permission ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user can manage this seminar
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

    // Delete permission
    const { error: deleteError } = await supabase
      .from('seminar_permissions')
      .delete()
      .eq('id', permissionId)
      .eq('seminar_id', seminarId);

    if (deleteError) {
      console.error('Error deleting permission:', deleteError);
      return NextResponse.json({ error: 'Failed to remove permission' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in permissions DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 