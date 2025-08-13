import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;

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

    console.log('🔍 Fetching enrollments for seminar:', seminarId);

    // Use service client for comprehensive data access
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has permission to manage this seminar
    const { data: seminar, error: seminarError } = await serviceSupabase
      .from('seminars')
      .select('owner_id, capacity')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check permission - only seminar owner or admin can manage enrollments
    const { data: currentUser } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = currentUser?.role === 'admin';
    const isOwner = seminar.owner_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Fetch enrollments with user details (specify which users relationship to use)
    const { data: enrollments, error: enrollmentsError } = await serviceSupabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        status,
        applied_at,
        users!enrollments_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('seminar_id', seminarId)
      .order('applied_at', { ascending: true });

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    console.log('✅ Fetched enrollments:', enrollments?.length || 0, 'records');

    // Transform data for frontend
    const transformedEnrollments = enrollments?.map(enrollment => ({
      id: enrollment.id,
      userId: enrollment.user_id,
      name: enrollment.users?.name || 'Unknown',
      email: enrollment.users?.email || 'Unknown',
      appliedAt: enrollment.applied_at,
      status: enrollment.status
    })) || [];

    const stats = {
      capacity: seminar.capacity,
      total: transformedEnrollments.length,
      approved: transformedEnrollments.filter(e => e.status === 'approved').length,
      pending: transformedEnrollments.filter(e => e.status === 'pending').length,
      rejected: transformedEnrollments.filter(e => e.status === 'rejected').length
    };

    return NextResponse.json({
      capacity: seminar.capacity,
      stats,
      enrollments: transformedEnrollments
    });

  } catch (error) {
    console.error('❌ Enrollments API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    const { enrollmentId, status } = await request.json();

    if (!enrollmentId || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

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

    console.log('🔄 Updating enrollment status:', enrollmentId, 'to', status);

    // Use service client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check permission
    const { data: seminar } = await serviceSupabase
      .from('seminars')
      .select('owner_id')
      .eq('id', seminarId)
      .single();

    const { data: currentUser } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = currentUser?.role === 'admin';
    const isOwner = seminar?.owner_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update enrollment status
    const { data: updatedEnrollment, error: updateError } = await serviceSupabase
      .from('enrollments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId)
      .eq('seminar_id', seminarId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
    }

    console.log('✅ Updated enrollment status successfully');

    return NextResponse.json({
      message: 'Enrollment status updated successfully',
      enrollment: updatedEnrollment
    });

  } catch (error) {
    console.error('❌ Update enrollment error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 