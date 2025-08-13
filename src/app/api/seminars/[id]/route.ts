import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    let authenticatedSupabase = supabase;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && user) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          });
        }
      }
    }

    // Get seminar details with related data
    const { data: seminar, error: seminarError } = await authenticatedSupabase
      .from('seminars')
      .select(`
        *,
        semesters (
          id,
          name,
          start_date,
          end_date,
          is_active
        ),
        sessions (
          id,
          session_number,
          title,
          description,
          date,
          duration_minutes,
          location,
          materials_url,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (seminarError) {
      console.error('Error fetching seminar:', seminarError);
      if (seminarError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch seminar' }, { status: 500 });
    }

    if (!seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Use service key to fetch users and enrollments data
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch owner information
    let ownerInfo = { id: null, name: 'Unknown', email: null };
    if (seminar.owner_id) {
      const { data: owner, error: ownerError } = await serviceSupabase
        .from('users')
        .select('id, name, email')
        .eq('id', seminar.owner_id)
        .single();
      
      if (!ownerError && owner) {
        ownerInfo = owner;
        console.log('✅ Fetched owner info via service key');
      } else {
        console.error('❌ Error fetching owner info:', ownerError);
      }
    }

    // Fetch enrollments information
    let enrollments: any[] = [];
    const { data: enrollmentData, error: enrollmentError } = await serviceSupabase
      .from('enrollments')
      .select('id, user_id, status, applied_at')
      .eq('seminar_id', id);
    
    if (!enrollmentError && enrollmentData) {
      enrollments = enrollmentData;
      console.log('✅ Fetched enrollment info via service key:', enrollments.length, 'enrollments');
    } else {
      console.error('❌ Error fetching enrollment info:', enrollmentError);
    }

    // Transform the data to match frontend expectations
    const transformedSeminar = {
      id: seminar.id,
      title: seminar.title,
      description: seminar.description,
      capacity: seminar.capacity,
      owner: ownerInfo,
      semester: {
        id: seminar.semesters?.id,
        name: seminar.semesters?.name || 'Unknown',
        startDate: seminar.semesters?.start_date,
        endDate: seminar.semesters?.end_date,
        isActive: seminar.semesters?.is_active
      },
      startDate: seminar.start_date,
      endDate: seminar.end_date,
      location: seminar.location,
      tags: seminar.tags || [],
      status: seminar.status,
      applicationStart: seminar.application_start,
      applicationEnd: seminar.application_end,
      applicationType: seminar.application_type,
      enrollments: {
        total: enrollments.length || 0,
        approved: enrollments.filter(e => e.status === 'approved').length || 0,
        pending: enrollments.filter(e => e.status === 'pending').length || 0,
        rejected: enrollments.filter(e => e.status === 'rejected').length || 0
      },
      sessions: seminar.sessions?.sort((a, b) => a.session_number - b.session_number) || [],
      createdAt: seminar.created_at,
      updatedAt: seminar.updated_at
    };

    return NextResponse.json(transformedSeminar);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Check if user can edit this seminar
    const { data: seminar, error: seminarError } = await authenticatedSupabase
      .from('seminars')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await authenticatedSupabase
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
    const { data: updatedSeminar, error: updateError } = await authenticatedSupabase
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