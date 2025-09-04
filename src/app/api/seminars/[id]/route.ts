import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    console.log('📖 Fetching seminar details:', seminarId);

    // Create client - authentication is optional for this endpoint
    const supabase = await createClient();

    // Fetch seminar with all related data
    const { data: seminar, error } = await supabase
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
          status,
          applied_at,
          users!enrollments_user_id_fkey (
            name,
            email
          )
        ),
        sessions (
          id,
          title,
          description,
          date,
          duration_minutes,
          location,
          session_number,
          status,
          materials_url
        )
      `)
      .eq('id', seminarId)
      .single();

    if (error) {
      console.error('Seminar fetch error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch seminar' }, { status: 500 });
    }

    if (!seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Transform data for better frontend consumption
    const transformedSeminar = {
      ...seminar,
      owner: {
        id: seminar.owner_id,
        name: seminar.users?.name || 'Unknown',
        email: seminar.users?.email || 'Unknown',
      },
      semester: {
        name: seminar.semesters?.name || 'Unknown',
        isActive: seminar.semesters?.is_active || false,
      },
      enrollments: {
        total: seminar.enrollments?.length || 0,
        approved: seminar.enrollments?.filter((e: any) => e.status === 'approved').length || 0,
        pending: seminar.enrollments?.filter((e: any) => e.status === 'pending').length || 0,
        rejected: seminar.enrollments?.filter((e: any) => e.status === 'rejected').length || 0,
        list: seminar.enrollments?.map((e: any) => ({
          id: e.id,
          user_id: e.user_id,
          status: e.status,
          applied_at: e.applied_at,
          user: {
            name: e.users?.name || 'Unknown',
            email: e.users?.email || 'Unknown',
          }
        })) || [],
      },
      // Ensure dates are properly formatted or null  
      startDate: seminar.start_date,
      endDate: seminar.end_date,
      applicationStart: seminar.application_start,
      applicationEnd: seminar.application_end,
      applicationType: seminar.application_type,

      sessions: seminar.sessions?.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ) || [],
    };

    // Remove the nested objects we've already transformed
    delete transformedSeminar.users;
    delete transformedSeminar.semesters;

    console.log('✅ Seminar fetched successfully:', seminar.title);

    return NextResponse.json(transformedSeminar);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('📝 Updating seminar:', id);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    // Check if user can edit this seminar
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Parse request body
    const updates = await request.json();
    
    // Prepare update object
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.capacity !== undefined) updateData.capacity = updates.capacity;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.applicationStart !== undefined) updateData.application_start = updates.applicationStart;
    if (updates.applicationEnd !== undefined) updateData.application_end = updates.applicationEnd;
    if (updates.applicationType !== undefined) updateData.application_type = updates.applicationType;
    if (updates.status !== undefined) updateData.status = updates.status;

    // Update seminar
    const { data: updatedSeminar, error: updateError } = await supabase
      .from('seminars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating seminar:', updateError);
      return NextResponse.json({ error: 'Failed to update seminar' }, { status: 500 });
    }

    return NextResponse.json(updatedSeminar);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 