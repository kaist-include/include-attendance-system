import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client - will be authenticated if user has valid session
    const supabase = await createClient();
    
    // Get current user to check enrollment status
    const { data: { user } } = await supabase.auth.getUser();

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
          user_id,
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
    const transformedSeminars = data?.map(seminar => {
      // Check current user's enrollment status
      const currentUserEnrollment = user ? 
        seminar.enrollments?.find((e: any) => e.user_id === user.id) : null;
      
      return {
        id: seminar.id,
        title: seminar.title,
        description: seminar.description,
        instructor: seminar.users?.name || 'Unknown',
        startDate: seminar.start_date,
        endDate: seminar.end_date,
        capacity: seminar.capacity || seminar.max_participants || 0,
        enrolled: seminar.enrollments?.filter((e: any) => e.status === 'approved').length || 0,
        location: seminar.location,
        tags: seminar.tags || [],
        status: seminar.status,
        sessions: seminar.sessions?.length || 0,
        semester: seminar.semesters?.name || 'Unknown',
        applicationStart: seminar.application_start,
        applicationEnd: seminar.application_end,
        applicationType: seminar.application_type,
        currentUserEnrollment: currentUserEnrollment ? {
          status: currentUserEnrollment.status,
          applied_at: currentUserEnrollment.applied_at
        } : null,
      };
    }) || [];

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

    // Get semester by name from the request
    const semesterName = data.semester;
    if (!semesterName) {
      return NextResponse.json({ error: 'Semester is required' }, { status: 400 });
    }

    // Find or create semester by name
    let { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('id')
      .eq('name', semesterName)
      .single();

    if (semesterError || !semester) {
      // If semester doesn't exist, create it
      const { data: newSemester, error: createError } = await supabase
        .from('semesters')
        .insert({
          name: semesterName,
          start_date: data.start_date || data.startDate,
          end_date: data.end_date || data.endDate || data.start_date || data.startDate,
          is_active: false
        })
        .select()
        .single();

             if (createError || !newSemester) {
         console.error('Error creating semester:', createError);
         return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 });
       }

       semester = newSemester;
     }

     if (!semester) {
       return NextResponse.json({ error: 'Semester not found' }, { status: 400 });
     }

     // Create seminar
    const { data: seminar, error } = await supabase
      .from('seminars')
      .insert({
        title: data.title,
        description: data.description,
        capacity: data.capacity,
        start_date: data.start_date || data.startDate,
        end_date: data.end_date || data.endDate,
        location: data.location,
        owner_id: user.id,
        semester_id: semester.id,
        status: 'draft',
        application_type: data.application_type || data.applicationType,
        application_start: data.application_start || data.applicationStart,
        application_end: data.application_end || data.applicationEnd,
        tags: data.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating seminar:', error);
      return NextResponse.json({ error: 'Failed to create seminar' }, { status: 500 });
    }

    console.log('✅ Seminar created successfully:', seminar.id);

    // Automatically enroll the creator in their own seminar
    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        seminar_id: seminar.id,
        status: 'approved',
        applied_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: user.id, // Self-approved
        notes: 'Automatically enrolled as seminar creator'
      });

    if (enrollmentError) {
      console.warn('Warning: Failed to auto-enroll creator:', enrollmentError);
      // Don't fail the seminar creation if enrollment fails - just log it
    } else {
      console.log('✅ Creator automatically enrolled in seminar');
    }

    return NextResponse.json({ seminar });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 