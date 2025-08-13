import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('No token found in authorization header');
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 });
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.error('No user found for token');
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Create an authenticated Supabase client using the user's token
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

    // First, get the user's approved enrollments using authenticated client
    const { data: enrollments, error: enrollmentError } = await authenticatedSupabase
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

    // Get upcoming sessions for enrolled seminars (within 1 week) using authenticated client
    const { data: sessions, error } = await authenticatedSupabase
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
    const transformedSessions = sessions?.map(session => ({
      id: session.id,
      title: session.seminars?.title || 'Unknown',
      session: `${session.session_number}회차`,
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