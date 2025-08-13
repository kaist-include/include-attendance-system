import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header (optional for seminars - they should be publicly accessible)
    const authHeader = request.headers.get('authorization');
    let authenticatedSupabase = supabase; // Default to anonymous client
    
    // If user is authenticated, use their token for better access
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      if (token) {
        // Verify the user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && user) {
          // Create an authenticated Supabase client
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let query = authenticatedSupabase
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
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by search term if provided
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Filter by tags if provided
    if (tags) {
      const tagArray = tags.split(',');
      query = query.overlaps('tags', tagArray);
    }

    const { data: seminars, error } = await query;

    if (error) {
      console.error('Error fetching seminars:', error);
      return NextResponse.json({ error: 'Failed to fetch seminars' }, { status: 500 });
    }

    console.log('📊 Raw seminars data (first 2 items):', seminars?.slice(0, 2).map(s => ({
      id: s.id,
      title: s.title,
      owner_id: s.owner_id,
      users: s.users,
      semesters: s.semesters
    })));

    // Use service client to fetch both users and enrollments data (public info)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch users data
    const seminarOwnerIds = seminars?.map(s => s.owner_id).filter(Boolean) || [];
    let userMap: Record<string, any> = {};
    
    if (seminarOwnerIds.length > 0) {
      const { data: users, error: usersError } = await serviceSupabase
        .from('users')
        .select('id, name, email')
        .in('id', seminarOwnerIds);
      
      if (!usersError && users) {
        userMap = users.reduce((acc: Record<string, any>, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, any>);
        console.log('✅ Fetched user data via service key:', Object.keys(userMap).length, 'users');
      } else {
        console.error('❌ Error fetching users via service key:', usersError);
      }
    }

    // Fetch enrollments data separately
    const seminarIds = seminars?.map(s => s.id).filter(Boolean) || [];
    let enrollmentMap: Record<string, number> = {};

    if (seminarIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await serviceSupabase
        .from('enrollments')
        .select('seminar_id, status')
        .in('seminar_id', seminarIds);
      
      if (!enrollmentsError && enrollments) {
        enrollmentMap = enrollments.reduce((acc: Record<string, number>, enrollment) => {
          if (enrollment.status === 'approved') {
            acc[enrollment.seminar_id] = (acc[enrollment.seminar_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        console.log('✅ Fetched enrollment data via service key:', Object.keys(enrollmentMap).length, 'seminars');
      } else {
        console.error('❌ Error fetching enrollments via service key:', enrollmentsError);
      }
    }

    // Transform the data to match the frontend expectations
    const transformedSeminars = seminars?.map(seminar => {
      // Better fallback for instructor name
      let instructorName = 'Unknown';
      
      // Try from JOIN first, then from separate fetch
      const userInfo = seminar.users || userMap[seminar.owner_id];
      
      if (userInfo?.name) {
        instructorName = userInfo.name;
      } else {
        // Log missing user info for debugging
        console.warn(`⚠️ Missing user info for seminar "${seminar.title}" (owner_id: ${seminar.owner_id})`);
        
        // Try to get a better fallback from owner_id or other sources
        if (seminar.owner_id) {
          instructorName = `User ${seminar.owner_id.slice(0, 8)}...`;
        }
      }

      return {
        id: seminar.id,
        title: seminar.title,
        description: seminar.description,
        instructor: instructorName,
        startDate: seminar.start_date,
        endDate: seminar.end_date,
        capacity: seminar.capacity,
        enrolled: enrollmentMap[seminar.id] || 0,
        location: seminar.location,
        tags: seminar.tags || [],
        status: seminar.status,
        sessions: seminar.sessions?.length || 0,
        semester: seminar.semesters?.name || 'Unknown',
        applicationStart: seminar.application_start,
        applicationEnd: seminar.application_end,
        applicationType: seminar.application_type,
      };
    }) || [];

    return NextResponse.json(transformedSeminars);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 