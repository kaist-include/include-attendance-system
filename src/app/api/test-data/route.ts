import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🧪 Admin creating test data...');

    // Create test semester
    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .insert({
        name: 'Test Semester 2024',
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (semesterError) {
      console.error('Error creating semester:', semesterError);
      return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 });
    }

    // Create test seminar
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .insert({
        title: 'Test Seminar',
        description: 'This is a test seminar created for testing purposes',
        owner_id: user.id,
        semester_id: semester.id,
        tags: ['test', 'programming'],
        status: 'active',
        max_participants: 20,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (seminarError) {
      console.error('Error creating seminar:', seminarError);
      return NextResponse.json({ error: 'Failed to create seminar' }, { status: 500 });
    }

    // Create test sessions
    const sessions = [];
    for (let i = 1; i <= 3; i++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + (i * 7)); // Weekly sessions

      const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        seminar_id: seminar.id,
          title: `Session ${i}`,
          description: `Test session ${i} content`,
          date: sessionDate.toISOString(),
          duration_minutes: 90,
          location: 'Test Room',
          session_number: i,
          created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
        console.error(`Error creating session ${i}:`, sessionError);
      } else {
        sessions.push(session);
    }
    }

    console.log('✅ Test data created successfully');

    return NextResponse.json({
      message: 'Test data created successfully',
      data: {
        semester,
        seminar,
        sessions,
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 