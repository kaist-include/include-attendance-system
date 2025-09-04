import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    console.log('🔍 My Attendance API called for seminar:', seminarId);
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

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

    // Check if seminar exists
    const { data: seminar, error: seminarError } = await authenticatedSupabase
      .from('seminars')
      .select('id, title, owner_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      console.log('❌ Seminar error:', seminarError);
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    console.log('✅ Seminar found:', seminar.title);

    // Check if user is enrolled in this seminar
    const { data: enrollment, error: enrollmentError } = await authenticatedSupabase
      .from('enrollments')
      .select('status')
      .eq('user_id', user.id)
      .eq('seminar_id', seminarId)
      .single();

    if (enrollmentError || !enrollment) {
      console.log('❌ User not enrolled in seminar');
      return NextResponse.json({ error: 'You are not enrolled in this seminar' }, { status: 403 });
    }

    if (enrollment.status !== 'approved') {
      console.log('❌ User enrollment not approved:', enrollment.status);
      return NextResponse.json({ error: 'Your enrollment is not approved' }, { status: 403 });
    }

    console.log('✅ User is enrolled and approved');

    // Check user role for UI purposes
    const { data: userRecord } = await authenticatedSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isManager = seminar.owner_id === user.id || userRecord?.role === 'admin';

    // Get sessions for this seminar
    const { data: sessions, error: sessionsError } = await authenticatedSupabase
      .from('sessions')
      .select(`
        id,
        session_number,
        title,
        description,
        date,
        duration_minutes,
        location,
        status
      `)
      .eq('seminar_id', seminarId)
      .order('session_number', { ascending: true });

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    console.log('✅ Sessions found:', sessions?.length || 0);

    // Get user's attendance records for all sessions
    const sessionIds = sessions?.map(s => s.id) || [];
    let myAttendances: any[] = [];
    
    if (sessionIds.length > 0) {
      const { data: attendanceData, error: attendanceError } = await authenticatedSupabase
        .from('attendances')
        .select(`
          session_id,
          status,
          checked_at,
          checked_by,
          notes
        `)
        .eq('user_id', user.id)
        .in('session_id', sessionIds);

      if (attendanceError) {
        console.error('❌ Error fetching attendance:', attendanceError);
        return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
      }

      myAttendances = attendanceData || [];
    }

    console.log('✅ My attendance records found:', myAttendances.length);

    // Combine session data with attendance status
    const sessionsWithAttendance = sessions?.map(session => {
      const attendance = myAttendances.find(a => a.session_id === session.id);
      
      return {
        id: session.id,
        sessionNumber: session.session_number,
        title: session.title,
        description: session.description,
        date: session.date,
        durationMinutes: session.duration_minutes,
        location: session.location,
        status: session.status,
        attendance: {
          status: attendance?.status || 'absent',
          checkedAt: attendance?.checked_at || null,
          checkedBy: attendance?.checked_by || null,
          notes: attendance?.notes || null
        }
      };
    }) || [];

    // Calculate attendance statistics
    const totalSessions = sessionsWithAttendance.length;
    const presentCount = sessionsWithAttendance.filter(s => s.attendance.status === 'present').length;
    const lateCount = sessionsWithAttendance.filter(s => s.attendance.status === 'late').length;
    const excusedCount = sessionsWithAttendance.filter(s => s.attendance.status === 'excused').length;
    const absentCount = sessionsWithAttendance.filter(s => s.attendance.status === 'absent').length;

    const transformedData = {
      seminar: {
        id: seminarId,
        title: seminar.title,
        isManager
      },
      user: {
        id: user.id,
        email: user.email
      },
      sessions: sessionsWithAttendance,
      statistics: {
        total: totalSessions,
        present: presentCount,
        late: lateCount,
        excused: excusedCount,
        absent: absentCount,
        attendanceRate: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0
      }
    };

    console.log('✅ My attendance data prepared successfully');
    console.log('📊 Statistics:', transformedData.statistics);

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('❌ My Attendance API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 