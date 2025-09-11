import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current semester
    const { data: currentSemester } = await supabase
      .from('semesters')
      .select('*')
      .eq('is_active', true)
      .single();

    // 1. Get count of seminars user is currently enrolled in
    let currentSeminarsCount = 0;
    if (currentSemester) {
      const { data: currentSeminars } = await supabase
        .from('enrollments')
        .select(`
          seminar_id,
          seminars!inner (
            id,
            status,
            semester_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('seminars.semester_id', currentSemester.id)
        .in('seminars.status', ['recruiting', 'in_progress']);
      
      currentSeminarsCount = currentSeminars?.length || 0;
    }

    // 2. Calculate average attendance rate for last 4 weeks
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        attendances!inner (
          user_id,
          status
        )
      `)
      .gte('date', fourWeeksAgo.toISOString())
      .lte('date', new Date().toISOString())
      .eq('attendances.user_id', user.id);

    let attendanceRate = 0;
    if (recentSessions && recentSessions.length > 0) {
      const totalSessions = recentSessions.length;
      const presentCount = recentSessions.filter(session => 
        session.attendances.some(att => att.status === 'present')
      ).length;
      attendanceRate = Math.round((presentCount / totalSessions) * 100);
    }

    // 3. Get count of completed seminars
    const { data: completedSeminars } = await supabase
      .from('enrollments')
      .select(`
        seminar_id,
        seminars!inner (
          id,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('seminars.status', 'completed');
    
    const completedSeminarsCount = completedSeminars?.length || 0;

    // 4. Get upcoming sessions count for this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const { data: upcomingSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        seminar_id,
        seminars!inner (
          enrollments!inner (
            user_id,
            status
          )
        )
      `)
      .gte('date', startOfWeek.toISOString())
      .lt('date', endOfWeek.toISOString())
      .eq('seminars.enrollments.user_id', user.id)
      .eq('seminars.enrollments.status', 'approved');

    const upcomingSessionsCount = upcomingSessions?.length || 0;

    // 5. Get additional insights
    const { data: totalEnrollments } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    // 6. Get recent activity count
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    const { data: recentActivity } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', user.id)
      .gte('checked_at', lastMonth.toISOString())
      .eq('status', 'present');

    const stats = {
      currentSeminars: currentSeminarsCount,
      attendanceRate: attendanceRate,
      upcomingSessions: upcomingSessionsCount,
      completedSeminars: completedSeminarsCount,
      totalEnrollments: totalEnrollments?.length || 0,
      recentActivity: recentActivity?.length || 0,
      currentSemester: currentSemester?.name || '미정'
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
} 