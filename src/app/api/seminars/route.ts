import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client - will be authenticated if user has valid session
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let query = supabase
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
          status
        ),
        sessions (
          id
        )
      `);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    if (tags) {
      const tagsArray = tags.split(',');
      query = query.contains('tags', tagsArray);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seminars:', error);
      return NextResponse.json({ error: 'Failed to fetch seminars' }, { status: 500 });
    }

    // Transform data to match frontend expectations
    const transformedSeminars = data?.map(seminar => ({
        id: seminar.id,
        title: seminar.title,
        description: seminar.description,
      instructor: seminar.users?.name || 'Unknown',
        startDate: seminar.start_date,
        endDate: seminar.end_date,
      capacity: seminar.capacity || seminar.max_participants || 0,
      enrolled: seminar.enrollments?.length || 0,
        location: seminar.location,
        tags: seminar.tags || [],
        status: seminar.status,
        sessions: seminar.sessions?.length || 0,
        semester: seminar.semesters?.name || 'Unknown',
    })) || [];

    return NextResponse.json(transformedSeminars);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    
    console.log('🎯 Creating new seminar:', {
      title: data.title,
      owner: user.id,
      applicationType: data.applicationType
    });

    // Check if user has permission to create seminars
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const hasPermission = userRecord.role === 'admin' || userRecord.role === 'seminar_leader';
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'Permission denied. Only administrators and seminar leaders can create seminars.' 
      }, { status: 403 });
    }

    // Get active semester
    const { data: activeSemester, error: semesterError } = await supabase
      .from('semesters')
      .select('id')
      .eq('is_active', true)
      .single();

    if (semesterError || !activeSemester) {
      return NextResponse.json({ error: 'No active semester found' }, { status: 400 });
    }

    // Create seminar
    const { data: seminar, error } = await supabase
      .from('seminars')
      .insert({
        title: data.title,
        description: data.description,
        capacity: data.capacity,
        start_date: data.startDate,
        end_date: data.endDate,
        location: data.location,
        owner_id: user.id,
        semester_id: activeSemester.id,
        status: 'draft',
        application_type: data.applicationType,
        application_start: data.applicationStart,
        application_end: data.applicationEnd,
        tags: data.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating seminar:', error);
      return NextResponse.json({ error: 'Failed to create seminar' }, { status: 500 });
    }

    console.log('✅ Seminar created successfully:', seminar.id);

    return NextResponse.json({ seminar });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 