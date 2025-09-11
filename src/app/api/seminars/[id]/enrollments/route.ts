import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEnrollmentApprovedNotification, sendEnrollmentRejectedNotification } from '@/lib/notifications';

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
        users!enrollments_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('seminar_id', seminarId)
      .order('applied_at', { ascending: true });

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    console.log(`✅ Found ${enrollments?.length || 0} enrollments`);

    // Transform data to match frontend expectations
    const transformedEnrollments = enrollments?.map(enrollment => ({
      id: enrollment.id,
      userId: enrollment.user_id,
      name: enrollment.users?.name || 'Unknown',
      email: enrollment.users?.email || 'Unknown',
      appliedAt: enrollment.applied_at,
      status: enrollment.status,
      notes: enrollment.notes
    })) || [];

    // Calculate stats
    const total = transformedEnrollments.length;
    const approved = transformedEnrollments.filter(e => e.status === 'approved').length;
    const pending = transformedEnrollments.filter(e => e.status === 'pending').length;
    const rejected = transformedEnrollments.filter(e => e.status === 'rejected').length;

    const enrollmentData = {
      capacity: seminar.capacity,
      stats: {
        capacity: seminar.capacity,
        total,
        approved,
        pending,
        rejected
      },
      enrollments: transformedEnrollments
    };

    return NextResponse.json(enrollmentData);

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

    // Prevent self-approval/rejection: Check if the enrollment being modified is the owner's own
    const { data: enrollmentToUpdate, error: enrollmentCheckError } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('id', enrollmentId)
      .eq('seminar_id', seminarId)
      .single();

    if (enrollmentCheckError || !enrollmentToUpdate) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Prevent self-approval/rejection with specific rules:
    // 1. Seminar owners cannot approve/reject their own applications (logically inconsistent)
    // 2. Admins can approve/reject their own applications to others' seminars (admin privilege)
    // 3. Regular users cannot approve/reject any applications (no permission)
    if (enrollmentToUpdate.user_id === user.id) {
      if (isOwner) {
        return NextResponse.json({ 
          error: '세미나 개설자는 자신의 세미나에 신청할 수 없습니다.' 
        }, { status: 403 });
      } else if (!isAdmin) {
        return NextResponse.json({ 
          error: '자신의 신청을 직접 승인/거절할 수 없습니다.' 
        }, { status: 403 });
      }
      // Admin processing their own application to someone else's seminar is allowed
    }

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
      const now = new Date().toISOString();
      
      const updateData: any = { status: newStatus };
      
      if (action === 'approve') {
        updateData.approved_at = now;
        updateData.approved_by = user.id;
      }
      
      const { data: enrollment, error: updateError } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', enrollmentId)
        .eq('seminar_id', seminarId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating enrollment:', updateError);
        return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
      }

      console.log(`✅ Enrollment ${action}d successfully:`, enrollment);

      // Send notification to the user
      try {
        if (action === 'approve') {
          await sendEnrollmentApprovedNotification(
            enrollment.user_id,
            seminar.title,
            seminarId,
            enrollmentId
          );
        } else if (action === 'reject') {
          await sendEnrollmentRejectedNotification(
            enrollment.user_id,
            seminar.title,
            seminarId,
            enrollmentId
          );
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the enrollment update if notification fails
      }

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

export async function POST(
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

    console.log('📝 User applying to seminar:', { user: user.id, seminar: seminarId });

    // Get seminar details and check if applications are open
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select(`
        title,
        status,
        capacity,
        application_start,
        application_end,
        enrollments (id, status)
      `)
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check if seminar is accepting applications
    if (seminar.status !== 'recruiting') {
      return NextResponse.json({ error: 'This seminar is not currently recruiting' }, { status: 400 });
    }

    // Check if application period is open
    const now = new Date();
    const appStart = new Date(seminar.application_start);
    const appEnd = new Date(seminar.application_end);
    
    if (now < appStart || now > appEnd) {
      return NextResponse.json({ error: 'Application period is closed' }, { status: 400 });
    }

    // Check if user already applied
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('seminar_id', seminarId)
      .eq('user_id', user.id)
      .single();

    if (existingEnrollment) {
      const statusMessages: Record<string, string> = {
        pending: '이미 신청하였습니다. 승인을 기다려주세요.',
        approved: '이미 승인된 세미나입니다.',
        rejected: '신청이 거절된 세미나입니다.',
        cancelled: '취소된 신청입니다.'
      };
      
      const statusMessage = statusMessages[existingEnrollment.status] || '이미 신청한 세미나입니다.';
      
      return NextResponse.json({ error: statusMessage }, { status: 400 });
    }

    // Check capacity (only count approved enrollments)
    const approvedEnrollments = seminar.enrollments?.filter((e: any) => e.status === 'approved').length || 0;
    if (approvedEnrollments >= seminar.capacity) {
      return NextResponse.json({ error: '세미나 정원이 가득 찼습니다.' }, { status: 400 });
    }

    // Get application data from request
    const { notes } = await request.json();

    // Create enrollment application (all applications start as 'pending' for owner approval)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        seminar_id: seminarId,
        status: 'pending',
        applied_at: new Date().toISOString(),
        notes: notes || null
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    console.log('✅ Application submitted successfully:', enrollment.id);

    return NextResponse.json({
      message: '신청이 완료되었습니다. 세미나 개설자의 승인을 기다려주세요.',
      enrollment
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 