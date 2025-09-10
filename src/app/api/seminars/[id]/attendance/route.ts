import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    console.log('🔍 Attendance API called for seminar:', seminarId);
    
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user can manage this seminar
    console.log('🔍 Checking seminar:', seminarId);
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id, title')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      console.log('❌ Seminar error:', seminarError);
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    console.log('✅ Seminar found:', seminar.title);

    // Check permissions
    console.log('🔍 Checking user permissions for:', user.id);
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    console.log('🔍 Permission check:', { isOwner, isAdmin, userRole: userRecord?.role });

    // Only managers can access full attendance management
    if (!isOwner && !isAdmin) {
      console.log('❌ Permission denied - only managers can access attendance management');
      return NextResponse.json({ error: 'Permission denied - only seminar managers can access this' }, { status: 403 });
    }

    console.log('✅ Permission granted - user is a manager');

    // Get sessions for this seminar
    console.log('🔍 Fetching sessions for seminar:', seminarId);
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        date,
        duration_minutes,
        location,
        status
      `)
      .eq('seminar_id', seminarId)
      .order('date', { ascending: true });

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    console.log('✅ Sessions found:', sessions?.length || 0);

    // Get enrolled users for this seminar
    console.log('🔍 Fetching enrolled users for seminar:', seminarId);
    
    // First, get enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('user_id, status')
      .eq('seminar_id', seminarId)
      .eq('status', 'approved');

    console.log('📋 Enrollments query result:', { enrollments, enrollmentsError });

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments:', enrollmentsError);
      return NextResponse.json({ 
        error: 'Failed to fetch enrollments',
        details: enrollmentsError.message,
        code: enrollmentsError.code
      }, { status: 500 });
    }

    // Then get user details for enrolled users
    let enrolledUsers: any[] = [];
    if (enrollments && enrollments.length > 0) {
      const userIds = enrollments.map(e => e.user_id);
      console.log('👥 Getting user details for IDs:', userIds);
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      console.log('👤 Users query result:', { users, usersError });

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return NextResponse.json({ 
          error: 'Failed to fetch user details',
          details: usersError.message,
          code: usersError.code
        }, { status: 500 });
      }

      // Combine enrollment and user data
      enrolledUsers = enrollments.map(enrollment => ({
        user_id: enrollment.user_id,
        users: users?.find(user => user.id === enrollment.user_id)
      })).filter(item => item.users); // Filter out any users that weren't found
    }

    console.log('✅ Enrolled users found:', enrolledUsers?.length || 0);

    // Get all attendance records for this seminar
    const sessionIds = sessions?.map(s => s.id) || [];
    let attendances: any[] = [];
    let attendanceError = null;
    
    if (sessionIds.length > 0) {
      const { data: attendanceData, error: attendanceErr } = await supabase
        .from('attendances')
        .select(`
          user_id,
          session_id,
          status,
          checked_at,
          checked_by,
          notes
        `)
        .in('session_id', sessionIds);
      
      attendances = attendanceData || [];
      attendanceError = attendanceErr;
    }

    if (attendanceError) {
      console.error('Error fetching attendances:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }

    // Transform data for frontend
    const users = enrolledUsers?.map(enrollment => enrollment.users) || [];
    const attendanceMap: Record<string, any> = {};
    
    attendances.forEach(attendance => {
      const key = `${attendance.user_id}-${attendance.session_id}`;
      attendanceMap[key] = attendance;
    });

    const transformedData = {
      seminar: {
        id: seminarId,
        title: seminar.title
      },
      sessions: sessions?.map((session, index) => ({
        ...session,
        sessionNumber: index + 1
      })) || [],
      users: users,
      attendances: attendanceMap
    };

    console.log('✅ Attendance data prepared successfully, sending response');
    console.log('📊 Data summary:', {
      seminarId,
      sessionsCount: sessions?.length || 0,
      usersCount: users.length,
      attendancesCount: Object.keys(attendanceMap).length
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('❌ API error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 