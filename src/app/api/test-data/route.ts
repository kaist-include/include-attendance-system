import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
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

    console.log('Creating test data for user:', user.id);

    // Create semester
    const { data: semester, error: semesterError } = await authenticatedSupabase
      .from('semesters')
      .upsert({
        name: '2025-1',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        is_active: true
      })
      .select()
      .single();

    if (semesterError) {
      console.error('Error creating semester:', semesterError);
      return NextResponse.json({ error: 'Failed to create semester', details: semesterError }, { status: 500 });
    }

    // Create seminar
    const { data: seminar, error: seminarError } = await authenticatedSupabase
      .from('seminars')
      .insert({
        title: 'Test 세미나',
        description: 'Test 세미나 설명',
        capacity: 20,
        semester_id: semester.id,
        owner_id: user.id,
        start_date: '2025-01-15',
        end_date: '2025-03-15',
        location: '온라인',
        tags: ['테스트'],
        status: 'recruiting',
        application_start: '2024-12-01T00:00:00Z',
        application_end: '2025-01-14T23:59:59Z',
        application_type: 'first_come'
      })
      .select()
      .single();

    if (seminarError) {
      console.error('Error creating seminar:', seminarError);
      return NextResponse.json({ error: 'Failed to create seminar', details: seminarError }, { status: 500 });
    }

    // Create session
    const { data: session, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .insert({
        seminar_id: seminar.id,
        session_number: 1,
        title: '첫 번째 세션',
        description: '테스트 세션입니다',
        date: '2025-01-20T10:00:00Z',
        duration_minutes: 120,
        location: '온라인',
        status: 'scheduled'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session', details: sessionError }, { status: 500 });
    }

    // Create enrollment for the current user
    const { data: enrollment, error: enrollmentError } = await authenticatedSupabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        seminar_id: seminar.id,
        status: 'approved'
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError);
      return NextResponse.json({ error: 'Failed to create enrollment', details: enrollmentError }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test data created successfully',
      data: {
        semester,
        seminar,
        session,
        enrollment
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 