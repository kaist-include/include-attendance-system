import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

export async function POST(
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

    // Check if user can manage this seminar
    const { data: seminar, error: seminarError } = await authenticatedSupabase
      .from('seminars')
      .select('owner_id')
      .eq('id', seminarId)
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
    const { title, description, date, duration_minutes, location } = await request.json();

    if (!title || !date || !duration_minutes) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, date, duration_minutes' 
      }, { status: 400 });
    }

    // Get the next session number
    const { data: lastSession } = await authenticatedSupabase
      .from('sessions')
      .select('session_number')
      .eq('seminar_id', seminarId)
      .order('session_number', { ascending: false })
      .limit(1)
      .single();

    const nextSessionNumber = (lastSession?.session_number || 0) + 1;

    // Create session
    const { data: newSession, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .insert({
        seminar_id: seminarId,
        session_number: nextSessionNumber,
        title,
        description: description || null,
        date,
        duration_minutes,
        location: location || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Recalculate seminar start/end dates based on all sessions
    await updateSeminarDates(seminarId, authenticatedSupabase);

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 