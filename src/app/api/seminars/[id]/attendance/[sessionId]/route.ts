import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    // Create authenticated client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .select(`
        *,
        seminars!inner (
          owner_id,
          title
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await authenticatedSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = session.seminars.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get enrolled users with their attendance status for this session
    console.log('🔍 Fetching enrolled users for seminar:', seminarId);
    
    // First, get enrollments
    const { data: enrollments, error: enrollmentsError } = await authenticatedSupabase
      .from('enrollments')
      .select('user_id, status')
      .eq('seminar_id', seminarId)
      .eq('status', 'approved');

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments:', enrollmentsError);
      return NextResponse.json({ 
        error: 'Failed to fetch enrollments',
        details: enrollmentsError.message
      }, { status: 500 });
    }

    // Then get user details for enrolled users
    let enrolledUsers: any[] = [];
    if (enrollments && enrollments.length > 0) {
      const userIds = enrollments.map(e => e.user_id);
      
      const { data: users, error: usersError } = await authenticatedSupabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return NextResponse.json({ 
          error: 'Failed to fetch user details',
          details: usersError.message
        }, { status: 500 });
      }

      // Combine enrollment and user data
      enrolledUsers = enrollments.map(enrollment => ({
        user_id: enrollment.user_id,
        users: users?.find(user => user.id === enrollment.user_id)
      })).filter(item => item.users);
    }

    // Get attendance records for this session
    const { data: attendances, error: attendanceError } = await authenticatedSupabase
      .from('attendances')
      .select(`
        user_id,
        status,
        checked_at,
        checked_by,
        notes
      `)
      .eq('session_id', sessionId);

    if (attendanceError) {
      console.error('Error fetching attendances:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }

    // Create attendance map
    const attendanceMap: Record<string, any> = {};
    attendances?.forEach(attendance => {
      attendanceMap[attendance.user_id] = attendance;
    });

    // Merge user data with attendance status
    const attendeesWithStatus = enrolledUsers?.map(enrollment => {
      const user = enrollment.users;
      const attendance = attendanceMap[user.id];
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        status: attendance?.status || 'absent',
        checkedAt: attendance?.checked_at || null,
        checkedBy: attendance?.checked_by || null,
        notes: attendance?.notes || null
      };
    }) || [];

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        sessionNumber: session.session_number,
        date: session.date,
        durationMinutes: session.duration_minutes,
        location: session.location,
        status: session.status
      },
      seminar: {
        id: seminarId,
        title: session.seminars.title
      },
      attendees: attendeesWithStatus
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    // Create authenticated client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .select(`
        *,
        seminars!inner (
          owner_id
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await authenticatedSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = session.seminars.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Parse request body
    const { userId, status, notes } = await request.json();

    if (!userId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, status' 
      }, { status: 400 });
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: present, absent, late, excused' 
      }, { status: 400 });
    }

    // Check if user is enrolled in the seminar
    const { data: enrollment, error: enrollmentError } = await authenticatedSupabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('seminar_id', seminarId)
      .eq('status', 'approved')
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'User is not enrolled in this seminar' }, { status: 400 });
    }

    // Upsert attendance record
    const attendanceData = {
      user_id: userId,
      session_id: sessionId,
      status,
      checked_at: new Date().toISOString(),
      checked_by: user.id,
      notes: notes || null
    };

    const { data: attendance, error: attendanceError } = await authenticatedSupabase
      .from('attendances')
      .upsert(attendanceData, {
        onConflict: 'user_id,session_id'
      })
      .select()
      .single();

    if (attendanceError) {
      console.error('Error updating attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 