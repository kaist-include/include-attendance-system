import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🔍 Debugging user state for:', user.id);

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get user enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        seminars (
          title,
          status
        )
      `)
      .eq('user_id', user.id);

    if (enrollmentsError) {
      console.error('Enrollments fetch error:', enrollmentsError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    // Get user attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        sessions (
          title,
          date,
          seminars (
            title
          )
        )
      `)
      .eq('user_id', user.id);

    if (attendanceError) {
      console.error('Attendance fetch error:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    const debugInfo = {
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at,
        last_sign_in: user.last_sign_in_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      },
      profile,
      enrollments: enrollments || [],
      attendance: attendance || [],
      stats: {
        enrollments_count: enrollments?.length || 0,
        attendance_count: attendance?.length || 0,
        has_profile: !!profile,
      }
    };

    console.log('🎯 Debug info compiled successfully');

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 