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
        users!seminars_owner_id_fkey (
          name
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

    // Transform the data to match the frontend expectations
    const transformedSeminars = seminars?.map(seminar => ({
      id: seminar.id,
      title: seminar.title,
      description: seminar.description,
      instructor: seminar.users?.name || 'Unknown',
      startDate: seminar.start_date,
      endDate: seminar.end_date,
      capacity: seminar.capacity,
      enrolled: seminar.enrollments?.filter(e => e.status === 'approved').length || 0,
      location: seminar.location,
      tags: seminar.tags || [],
      status: seminar.status,
      sessions: seminar.sessions?.length || 0,
      applicationStart: seminar.application_start,
      applicationEnd: seminar.application_end,
      applicationType: seminar.application_type,
    })) || [];

    return NextResponse.json(transformedSeminars);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 