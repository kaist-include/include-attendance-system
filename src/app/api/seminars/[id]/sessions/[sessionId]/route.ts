import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Helper function to recalculate seminar start/end dates based on sessions
async function recalculateSeminarDates(seminarId: string, supabase: any) {
  try {
    console.log('🔄 Recalculating dates for seminar:', seminarId);
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('date')
      .eq('seminar_id', seminarId)
      .order('date', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching sessions for date calculation:', sessionsError);
      return;
    }

    if (sessions && sessions.length > 0) {
      const startDate = sessions[0].date;
      const endDate = sessions[sessions.length - 1].date;
      
      console.log('📅 Updating seminar dates:', { startDate, endDate });
      
      const { error: updateError } = await supabase
      .from('seminars')
        .update({
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date().toISOString()
        })
      .eq('id', seminarId);

    if (updateError) {
      console.error('Error updating seminar dates:', updateError);
    } else {
      console.log('✅ Successfully updated seminar dates');
      }
    }
  } catch (error) {
    console.error('Error in recalculateSeminarDates:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;

    console.log('📖 Fetching session details for seminar:', seminarId, 'session:', sessionId);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get session details
    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
        seminars (
          title,
          description,
          owner_id,
          semesters (
            name,
            is_active
          )
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (error) {
      console.error('Session fetch error:', error);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('✅ Session found:', session.title);

    return NextResponse.json(session);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
    console.log('📝 Updating session:', sessionId, 'for seminar:', seminarId);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.date) {
      return NextResponse.json(
        { error: 'Title and date are required' }, 
        { status: 400 }
      );
    }

    // Verify user owns the seminar or has admin role
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Get user role to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';
    const isOwner = seminar.owner_id === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('👤 User authorized to update session');

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        title: body.title,
        date: body.date,
        location: body.location,
        description: body.description,
        duration_minutes: body.duration_minutes || 120,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .select()
      .single();

    if (updateError) {
      console.error('Session update error:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    console.log('✅ Session updated successfully');

    // Recalculate seminar dates after session update
    await recalculateSeminarDates(seminarId, supabase);

    return NextResponse.json({ 
      message: 'Session updated successfully', 
      session: updatedSession 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
    console.log('🗑️ Deleting session:', sessionId, 'for seminar:', seminarId);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user owns the seminar or has admin role
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('owner_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Get user role to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';
    const isOwner = seminar.owner_id === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('👤 User authorized to delete session');

    // Delete session
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('seminar_id', seminarId);

    if (deleteError) {
      console.error('Session deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    console.log('✅ Session deleted successfully');

    // Recalculate seminar dates after session deletion
    await recalculateSeminarDates(seminarId, supabase);

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 