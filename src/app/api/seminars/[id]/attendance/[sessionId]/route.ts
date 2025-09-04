import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await supabase
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
    const { data: userRecord, error: userError } = await supabase
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
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('user_id, status')
      .eq('seminar_id', seminarId)
      .eq('status', 'approved');

    if (enrollmentsError) {
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    // Get user details for enrolled users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', enrollments.map((e: any) => e.user_id));

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }

    // Get attendance records for this session
    const { data: attendances, error: attendanceError } = await supabase
      .from('attendances')
      .select('*')
      .eq('session_id', sessionId);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    // Combine the data
    const attendanceList = users.map((user: any) => {
      const attendance = attendances?.find((a: any) => a.user_id === user.id);
      return {
        id: user.id, // Use 'id' for React key prop
        name: user.name,
        email: user.email,
        status: attendance?.status || 'absent',
        checkedAt: attendance?.checked_at,
        checkedBy: attendance?.checked_by,
        notes: attendance?.notes
      };
    });

    return NextResponse.json({
      session: {
        id: session.id,
        sessionNumber: session.session_number,
        title: session.title,
        description: session.description,
        date: session.date,
        location: session.location,
        seminar: session.seminars
      },
      attendees: attendanceList
    });

  } catch (error) {
    console.error('Error in GET attendance/sessionId:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update attendance status for a student
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await supabase
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
    const { data: userRecord, error: userError } = await supabase
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

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      }, { status: 400 });
    }

    // Check if user is enrolled in the seminar
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('seminar_id', seminarId)
      .eq('status', 'approved')
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'User is not enrolled in this seminar' }, { status: 400 });
    }

    // Check if attendance record already exists
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    let attendance, attendanceError;

    if (existingAttendance) {
      // Update existing record
      const result = await supabase
        .from('attendances')
        .update({
          status: status,
          checked_at: new Date().toISOString(),
          checked_by: user.id,
          notes: notes || null
        })
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .select()
        .single();
      
      attendance = result.data;
      attendanceError = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from('attendances')
        .insert({
          user_id: userId,
          session_id: sessionId,
          status: status,
          checked_at: new Date().toISOString(),
          checked_by: user.id,
          notes: notes || null
        })
        .select()
        .single();
      
      attendance = result.data;
      attendanceError = result.error;
    }

    if (attendanceError) {
      console.error('Error updating attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
    }

    return NextResponse.json(attendance);

  } catch (error) {
    console.error('Error in POST attendance/sessionId:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 