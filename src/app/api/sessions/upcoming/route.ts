import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Fetching upcoming sessions for user:', user.id);

    // Get the user's approved enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('seminar_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    // If user has no enrollments, return empty array
    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json([]);
    }

    const seminarIds = enrollments.map(e => e.seminar_id);
    const currentTime = new Date().toISOString();
    
    // Calculate one week from now
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const oneWeekFromNowISO = oneWeekFromNow.toISOString();

    // Get upcoming sessions for enrolled seminars (within 1 week)
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        seminars (
          title
        )
      `)
      .in('seminar_id', seminarIds)
      .gte('date', currentTime)
      .lte('date', oneWeekFromNowISO)
      .order('date', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Transform the data
    const transformedSessions = sessions?.map((session, index) => ({
      id: session.id,
      title: session.seminars?.title || 'Unknown',
      session: `세션`, // Simplified for now, will be calculated per seminar if needed
      sessionTitle: session.title,
      date: new Date(session.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: new Date(session.date).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: session.location || '장소 미정',
      description: session.description,
    })) || [];

    return NextResponse.json(transformedSessions);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 