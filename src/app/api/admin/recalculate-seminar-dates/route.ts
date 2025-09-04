import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Helper function to recalculate seminar start/end dates based on sessions
async function updateSeminarDates(seminarId: string, serviceSupabase: any) {
  try {
    // Get all sessions for this seminar
    const { data: sessions, error: sessionsError } = await serviceSupabase
      .from('sessions')
      .select('date')
      .eq('seminar_id', seminarId)
      .order('date', { ascending: true });

    if (sessionsError) {
      console.error(`Error fetching sessions for seminar ${seminarId}:`, sessionsError);
      return { success: false, error: sessionsError.message };
    }

    let updateData: any = {};

    if (sessions && sessions.length > 0) {
      // Calculate start and end dates from sessions
      const sessionDates = sessions.map((s: { date: string }) => new Date(s.date));
      const startDate = new Date(Math.min(...sessionDates.map((d: Date) => d.getTime())));
      const endDate = new Date(Math.max(...sessionDates.map((d: Date) => d.getTime())));

      updateData.start_date = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      updateData.end_date = endDate.toISOString().split('T')[0];
      
      console.log(`📅 Updating seminar ${seminarId} dates: ${updateData.start_date} to ${updateData.end_date}`);
    } else {
      // No sessions, clear the dates
      updateData.start_date = null;
      updateData.end_date = null;
      
      console.log(`📅 Seminar ${seminarId} has no sessions, clearing dates`);
    }

    // Update seminar with calculated dates
    const { error: updateError } = await serviceSupabase
      .from('seminars')
      .update(updateData)
      .eq('id', seminarId);

    if (updateError) {
      console.error(`Error updating seminar ${seminarId} dates:`, updateError);
      return { success: false, error: updateError.message };
    }

    return { 
      success: true, 
      seminarId, 
      startDate: updateData.start_date, 
      endDate: updateData.end_date,
      sessionCount: sessions?.length || 0
    };
  } catch (error) {
    console.error(`Error in updateSeminarDates for ${seminarId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Use service client for the operations
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if this is the service key (admin bypass)
    const isServiceKey = token === supabaseServiceKey;
    
    if (!isServiceKey) {
      // If not service key, check user auth
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
      }

      // Check if user is admin
      const { data: currentUser } = await serviceSupabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    console.log('🔄 Starting seminar date recalculation for all seminars...');

    // Get all seminars
    const { data: seminars, error: seminarsError } = await serviceSupabase
      .from('seminars')
      .select('id, title');

    if (seminarsError) {
      console.error('Error fetching seminars:', seminarsError);
      return NextResponse.json({ error: 'Failed to fetch seminars' }, { status: 500 });
    }

    console.log(`📊 Found ${seminars?.length || 0} seminars to process`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each seminar
    for (const seminar of seminars || []) {
      const result = await updateSeminarDates(seminar.id, serviceSupabase);
      results.push({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`✅ Completed seminar date recalculation. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      message: 'Seminar date recalculation completed',
      summary: {
        totalSeminars: seminars?.length || 0,
        successCount,
        errorCount
      },
      results
    });

  } catch (error) {
    console.error('❌ Admin recalculate seminar dates error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 