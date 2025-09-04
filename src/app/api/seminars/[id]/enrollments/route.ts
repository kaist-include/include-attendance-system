import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🔍 Fetching enrollments for seminar:', seminarId);

    // Check if user has permission to manage this seminar
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id, capacity')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get enrollments with user details
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .eq('seminar_id', seminarId)
      .order('created_at', { ascending: true });

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    console.log(`✅ Found ${enrollments?.length || 0} enrollments`);

    return NextResponse.json(enrollments || []);

  } catch (error) {
    console.error('Error in GET enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🔍 Managing enrollments for seminar:', seminarId);

    // Check if user has permission to manage this seminar
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id, title, capacity')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { action, enrollmentId, userId } = await request.json();

    if (!action || !enrollmentId) {
      return NextResponse.json({ 
        error: 'Missing required fields: action, enrollmentId' 
      }, { status: 400 });
    }

    const validActions = ['approve', 'reject', 'remove'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be one of: ' + validActions.join(', ')
      }, { status: 400 });
    }

    if (action === 'remove') {
      // Delete enrollment
      const { error: deleteError } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId)
        .eq('seminar_id', seminarId);

      if (deleteError) {
        console.error('Error removing enrollment:', deleteError);
        return NextResponse.json({ error: 'Failed to remove enrollment' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Enrollment removed successfully' });
    } else {
      // Update enrollment status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { data: enrollment, error: updateError } = await supabase
        .from('enrollments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId)
        .eq('seminar_id', seminarId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating enrollment:', updateError);
        return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
      }

      console.log(`✅ Enrollment ${action}d successfully:`, enrollment);

      return NextResponse.json({
        message: `Enrollment ${action}d successfully`,
        enrollment
      });
    }

  } catch (error) {
    console.error('Error in PUT enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 