import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendSeminarUpdatedNotification, sendSeminarDeletedNotification } from '@/lib/notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    console.log('📖 Fetching seminar details:', seminarId);

    // Create client - authentication is optional for this endpoint
    const supabase = await createClient();
    
    // Get current user (if authenticated) to check enrollment status
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch seminar with all related data
    const { data: seminar, error } = await supabase
      .from('seminars')
      .select(`
        *,
        users!owner_id (
          name,
          email
        ),
        semesters (
          name,
          is_active
        ),
        enrollments (
          id,
          user_id,
          status,
          applied_at,
          users!enrollments_user_id_fkey (
            name,
            email
          )
        ),
        sessions (
          id,
          title,
          description,
          date,
          duration_minutes,
          location,
  
          status,
          external_url
        )
      `)
      .eq('id', seminarId)
      .single();

    if (error) {
      console.error('Seminar fetch error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch seminar' }, { status: 500 });
    }

    if (!seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Transform data for better frontend consumption
    const transformedSeminar = {
      ...seminar,
      owner: {
        id: seminar.owner_id,
        name: seminar.users?.name || 'Unknown',
        email: seminar.users?.email || 'Unknown',
      },
      semester: {
        name: seminar.semesters?.name || 'Unknown',
        isActive: seminar.semesters?.is_active || false,
      },
      enrollments: {
        total: seminar.enrollments?.length || 0,
        approved: seminar.enrollments?.filter((e: any) => e.status === 'approved').length || 0,
        pending: seminar.enrollments?.filter((e: any) => e.status === 'pending').length || 0,
        rejected: seminar.enrollments?.filter((e: any) => e.status === 'rejected').length || 0,
        list: seminar.enrollments?.map((e: any) => ({
          id: e.id,
          user_id: e.user_id,
          status: e.status,
          applied_at: e.applied_at,
          user: {
            name: e.users?.name || 'Unknown',
            email: e.users?.email || 'Unknown',
          }
        })) || [],
      },
      // Ensure dates are properly formatted or null  
      startDate: seminar.start_date,
      endDate: seminar.end_date,
      applicationStart: seminar.application_start,
      applicationEnd: seminar.application_end,
      

      sessions: seminar.sessions?.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ) || [],
      
      // Add current user enrollment status if user is authenticated
      currentUserEnrollment: user ? seminar.enrollments?.find((e: any) => e.user_id === user.id) || null : null,
    };

    // Remove the nested objects we've already transformed
    delete transformedSeminar.users;
    delete transformedSeminar.semesters;

    console.log('✅ Seminar fetched successfully:', seminar.title);

    return NextResponse.json(transformedSeminar);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('📝 Updating seminar:', id);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    // Check if user can edit this seminar and get original data for comparison
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id, title, description, location, start_date, end_date')
      .eq('id', id)
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

    // Parse request body
    const updates = await request.json();
    
    // Prepare update object
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.capacity !== undefined) updateData.capacity = updates.capacity;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.external_url !== undefined || updates.externalUrl !== undefined) {
      updateData.external_url = updates.external_url || updates.externalUrl || null;
    }
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.applicationStart !== undefined) updateData.application_start = updates.applicationStart;
    if (updates.applicationEnd !== undefined) updateData.application_end = updates.applicationEnd;

    if (updates.status !== undefined) updateData.status = updates.status;

    // Handle semester_id updates (validate semester exists)
    if (updates.semester_id !== undefined) {
      const { data: semester, error: semesterError } = await supabase
        .from('semesters')
        .select('id, name')
        .eq('id', updates.semester_id)
        .single();

      if (semesterError || !semester) {
        return NextResponse.json({ error: 'Invalid semester selected' }, { status: 400 });
      }
      updateData.semester_id = updates.semester_id;
    }

    // Update seminar
    const { data: updatedSeminar, error: updateError } = await supabase
      .from('seminars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating seminar:', updateError);
      return NextResponse.json({ error: 'Failed to update seminar' }, { status: 500 });
    }

    // Send notification about seminar update to enrolled users
    try {
      const changes = [];
      if (updateData.title && updateData.title !== seminar.title) {
        changes.push(`제목: ${seminar.title} → ${updateData.title}`);
      }
      if (updateData.description && updateData.description !== seminar.description) {
        changes.push('세미나 설명이 변경됨');
      }
      if (updateData.location && updateData.location !== seminar.location) {
        changes.push(`장소: ${seminar.location || '미정'} → ${updateData.location}`);
      }
      if (updateData.start_date && updateData.start_date !== seminar.start_date) {
        changes.push(`시작일: ${seminar.start_date} → ${updateData.start_date}`);
      }
      if (updateData.end_date && updateData.end_date !== seminar.end_date) {
        changes.push(`종료일: ${seminar.end_date || '미정'} → ${updateData.end_date || '미정'}`);
      }

      if (changes.length > 0) {
        await sendSeminarUpdatedNotification(
          id,
          updatedSeminar.title,
          changes.join(', ')
        );
      }
    } catch (notificationError) {
      console.error('Failed to send seminar update notification:', notificationError);
      // Don't fail the update if notification fails
    }

    return NextResponse.json(updatedSeminar);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🗑️ Deleting seminar:', id);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    // Check if seminar exists and get owner info
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, owner_id, status')
      .eq('id', id)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Initialize deletion counters
    let attendanceCount = 0;
    let sessionsCount = 0; 
    let enrollmentsCount = 0;

    // Check permissions - only owner or admin can delete
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    console.log('🔍 Detailed permission check:', {
      userId: user.id,
      userEmail: user.email,
      seminarOwnerId: seminar.owner_id,
      userRecord,
      userError,
      isOwner,
      isAdmin,
      canDelete: isOwner || isAdmin
    });

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if seminar has active enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('seminar_id', id);

    if (enrollmentError) {
      console.error('Error checking enrollments:', enrollmentError);
      return NextResponse.json({ error: 'Failed to check seminar enrollments' }, { status: 500 });
    }

    // Check if there are any approved enrollments
    const hasApprovedEnrollments = enrollments?.some(e => e.status === 'approved') || false;
    
    // Only allow deletion if no approved enrollments (or if admin is forcing deletion)
    if (hasApprovedEnrollments && !isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot delete seminar with approved enrollments. Contact admin if deletion is necessary.' 
      }, { status: 409 });
    }

    // Begin cascade deletion - delete in order to respect foreign key constraints
    
    // 1. First get all session IDs for this seminar
    const { data: sessions, error: sessionsQueryError } = await supabase
      .from('sessions')
              .select('id, title, date')
        .order('date', { ascending: true })
      .eq('seminar_id', id);

    if (sessionsQueryError) {
      console.error('❌ Error fetching session IDs:', sessionsQueryError);
      return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 });
    }

    console.log('📋 Found sessions to delete:', sessions?.length || 0, sessions);

    // 2. Delete attendance records for these sessions (if any exist)
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      console.log('🗑️ Deleting attendance records for session IDs:', sessionIds);
      
      const { data: deletedAttendances, error: attendanceError, count: attendanceDeleteCount } = await supabase
        .from('attendances')
        .delete()
        .in('session_id', sessionIds)
        .select('id');

      if (attendanceError) {
        console.error('❌ Error deleting attendance records:', attendanceError);
        return NextResponse.json({ error: 'Failed to delete attendance records' }, { status: 500 });
      }
      
      attendanceCount = attendanceDeleteCount || 0;
      console.log(`✅ Deleted ${attendanceCount} attendance records`);
    }

    // 3. Delete sessions - try with RLS-friendly approach
    console.log('🗑️ Deleting sessions for seminar:', id);
    
    // First try: standard deletion
    const { data: deletedSessions, error: sessionsError, count: sessionsDeleteCount } = await supabase
      .from('sessions')
      .delete()
      .eq('seminar_id', id)
      .select('id');

    if (sessionsError) {
      console.error('❌ Error deleting sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 });
    }
    
    sessionsCount = sessionsDeleteCount || 0;
    console.log(`✅ Deleted ${sessionsCount} sessions`);
    
    if (sessions && sessions.length > 0 && (!sessionsCount || sessionsCount === 0)) {
      console.error('⚠️ Warning: Expected to delete sessions but none were deleted. Possible RLS issue.');
      
      // Try individual deletion for each session
      console.log('🔄 Attempting individual session deletion...');
      let individualDeleteCount = 0;
      for (const session of sessions) {
        const { count } = await supabase
          .from('sessions')
          .delete()
          .eq('id', session.id)
          .select('id');
        individualDeleteCount += count || 0;
      }
      console.log(`📋 Individual deletion result: ${individualDeleteCount} sessions deleted`);
    }

    // 4. Check existing enrollments first
    const { data: existingEnrollments, error: enrollmentsQueryError } = await supabase
      .from('enrollments')
      .select('id, user_id, status')
      .eq('seminar_id', id);

    console.log('📋 Found enrollments to delete:', existingEnrollments?.length || 0, existingEnrollments);

    // Delete enrollments
    console.log('🗑️ Deleting enrollments for seminar:', id);
    
    const { data: deletedEnrollments, error: enrollmentsError, count: enrollmentsDeleteCount } = await supabase
      .from('enrollments')
      .delete()
      .eq('seminar_id', id)
      .select('id');

    if (enrollmentsError) {
      console.error('❌ Error deleting enrollments:', enrollmentsError);
      return NextResponse.json({ error: 'Failed to delete enrollments' }, { status: 500 });
    }
    
    enrollmentsCount = enrollmentsDeleteCount || 0;
    console.log(`✅ Deleted ${enrollmentsCount} enrollments`);
    
    if (existingEnrollments && existingEnrollments.length > 0 && (!enrollmentsCount || enrollmentsCount === 0)) {
      console.error('⚠️ Warning: Expected to delete enrollments but none were deleted. RLS policy issue!');
      
      // Try individual deletion for each enrollment
      console.log('🔄 Attempting individual enrollment deletion...');
      let individualDeleteCount = 0;
      for (const enrollment of existingEnrollments) {
        const { count } = await supabase
          .from('enrollments')
          .delete()
          .eq('id', enrollment.id)
          .select('id');
        individualDeleteCount += count || 0;
      }
      console.log(`📋 Individual enrollment deletion result: ${individualDeleteCount} enrollments deleted`);
    }

    // 5. Double-check seminar still exists before deletion
    const { data: seminarCheck, error: seminarCheckError } = await supabase
      .from('seminars')
      .select('id, title, owner_id, status')
      .eq('id', id)
      .single();

    if (seminarCheckError || !seminarCheck) {
      console.log('⚠️ Seminar no longer exists or cannot be found:', seminarCheckError);
      return NextResponse.json({ error: 'Seminar not found for deletion' }, { status: 404 });
    }

    console.log('📋 Seminar to delete confirmed:', seminarCheck);

    // Finally delete the seminar itself
    console.log('🗑️ Deleting seminar:', id);
    
    // Try with owner condition to satisfy potential RLS policy
    const { data: deletedSeminar, error: deleteError, count: seminarCount } = await supabase
      .from('seminars')
      .delete()
      .eq('id', id)
      .eq('owner_id', seminar.owner_id) // Add owner condition for RLS
      .select('id');

    if (deleteError) {
      console.error('❌ Error deleting seminar with owner condition:', deleteError);
      
      // Try alternative: delete with current user check
      console.log('🔄 Attempting seminar deletion with current user validation...');
      const { data: altDelete, error: altError, count: altCount } = await supabase
        .from('seminars')
        .delete()
        .eq('id', id)
        .select('id');
      
      if (altError) {
        console.error('❌ Alternative deletion also failed:', altError);
        return NextResponse.json({ error: 'Failed to delete seminar' }, { status: 500 });
      }
      
      console.log(`✅ Alternative deletion succeeded: ${altCount || 0} seminars`);
    } else {
      console.log(`✅ Deleted ${seminarCount || 0} seminars`);
    }

    // Final verification: Check if seminar still exists
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('seminars')
      .select('id')
      .eq('id', id)
      .single();

    if (finalCheck && !finalCheckError) {
      console.error('⚠️ CRITICAL: Seminar still exists after deletion attempt!');
      console.error('This suggests an RLS policy issue preventing deletion.');
      return NextResponse.json({ 
        error: 'Seminar deletion failed - seminar still exists. This may be a permission issue.' 
      }, { status: 403 });
    } else if (finalCheckError && finalCheckError.code === 'PGRST116') {
      // PGRST116 means "no rows returned" - this is what we want!
      console.log('✅ Final verification: Seminar successfully deleted');
    }

        console.log('✅ Seminar deleted successfully:', seminar.title);

    // Send notification to enrolled users about seminar deletion
    try {
      if (existingEnrollments && existingEnrollments.length > 0) {
        const enrolledUserIds = existingEnrollments
          .filter(e => e.status === 'approved')
          .map(e => e.user_id);
        
        if (enrolledUserIds.length > 0) {
          await sendSeminarDeletedNotification(
            seminar.id,
            seminar.title,
            enrolledUserIds
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to send seminar deletion notification:', notificationError);
      // Don't fail the deletion if notification fails
    }

    return NextResponse.json({
      message: 'Seminar deleted successfully',
      deletedSeminar: {
        id: seminar.id,
        title: seminar.title
      },
      deletionStats: {
        attendances: attendanceCount,
        sessions: sessionsCount,
        enrollments: enrollmentsCount,
        seminars: 'verified deleted'
      }
    });

  } catch (error) {
    console.error('Delete seminar API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 