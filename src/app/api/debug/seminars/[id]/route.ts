import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    console.log('🔍 Debug API called for seminar:', seminarId);
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization', authError }, { status: 401 });
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

    // Check seminar exists
    const { data: seminar, error: seminarError } = await authenticatedSupabase
      .from('seminars')
      .select('*')
      .eq('id', seminarId)
      .single();

    // Check user exists in users table
    const { data: userRecord, error: userError } = await authenticatedSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check sessions
    const { data: sessions, error: sessionsError } = await authenticatedSupabase
      .from('sessions')
      .select('*')
      .eq('seminar_id', seminarId);

    // Check enrollments
    const { data: enrollments, error: enrollmentsError } = await authenticatedSupabase
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