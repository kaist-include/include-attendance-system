import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    console.log('🔍 Debug API called for seminar:', seminarId);
    
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check seminar exists
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('*')
      .eq('id', seminarId)
      .single();

    // Check user exists in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('seminar_id', seminarId);

    // Check enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('seminar_id', seminarId);

    const debugInfo = {
      seminarId,
      user: {
        id: user.id,
        email: user.email,
        record: userRecord,
        error: userError
      },
      seminar: {
        data: seminar,
        error: seminarError
      },
      sessions: {
        data: sessions,
        count: sessions?.length || 0,
        error: sessionsError
      },
      enrollments: {
        data: enrollments,
        count: enrollments?.length || 0,
        error: enrollmentsError
      },
      permissions: {
        isOwner: seminar ? seminar.owner_id === user.id : false,
        isAdmin: userRecord ? userRecord.role === 'admin' : false
      }
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json({ 
      error: 'Debug API error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 