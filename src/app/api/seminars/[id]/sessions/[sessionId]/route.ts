import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to recalculate seminar start/end dates based on sessions
async function updateSeminarDates(seminarId: string, authenticatedSupabase: any) {
  try {
    // Get all sessions for this seminar
    const { data: sessions, error: sessionsError } = await authenticatedSupabase
      .from('sessions')
      .select('date')
      .eq('seminar_id', seminarId)
      .order('date', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching sessions for date calculation:', sessionsError);
      return;
    }

    let updateData: any = {};

    if (sessions && sessions.length > 0) {
      // Calculate start and end dates from sessions
      const sessionDates = sessions.map((s: { date: string }) => new Date(s.date));
      const startDate = new Date(Math.min(...sessionDates.map((d: Date) => d.getTime())));
      const endDate = new Date(Math.max(...sessionDates.map((d: Date) => d.getTime())));

      updateData.start_date = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      updateData.end_date = endDate.toISOString().split('T')[0];
      
      console.log(`📅 Updating seminar dates: ${updateData.start_date} to ${updateData.end_date}`);
    } else {
      // No sessions, clear the dates
      updateData.start_date = null;
      updateData.end_date = null;
      
      console.log('📅 No sessions found, clearing seminar dates');
    }

    // Update seminar with calculated dates
    const { error: updateError } = await authenticatedSupabase
      .from('seminars')
      .update(updateData)
      .eq('id', seminarId);

    if (updateError) {
      console.error('Error updating seminar dates:', updateError);
    } else {
      console.log('✅ Successfully updated seminar dates');
    }
  } catch (error) {
    console.error('Error in updateSeminarDates:', error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
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

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .select(`
        *,
        seminars!inner (
          owner_id
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await authenticatedSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = session.seminars.owner_id === user.id;
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
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.duration_minutes !== undefined) updateData.duration_minutes = updates.duration_minutes;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.materials_url !== undefined) updateData.materials_url = updates.materials_url;
    if (updates.status !== undefined) updateData.status = updates.status;

    // Update session
    const { data: updatedSession, error: updateError } = await authenticatedSupabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    // Recalculate seminar start/end dates if date was updated
    if (updates.date !== undefined) {
      await updateSeminarDates(seminarId, authenticatedSupabase);
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: seminarId, sessionId } = await params;
    
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

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .select(`
        *,
        seminars!inner (
          owner_id
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await authenticatedSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = session.seminars.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete session
    const { error: deleteError } = await authenticatedSupabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    // Recalculate seminar start/end dates after deletion
    await updateSeminarDates(seminarId, authenticatedSupabase);

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 