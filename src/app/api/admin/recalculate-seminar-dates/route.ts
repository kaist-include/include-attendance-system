import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Helper function to recalculate seminar start/end dates based on sessions
async function updateSeminarDates(seminarId: string, supabase: any) {
  try {
    // Get all sessions for this seminar
    const { data: sessions, error: sessionsError } = await supabase
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
    const { error: updateError } = await supabase
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
      updatedDates: updateData
    };
  } catch (error) {
    console.error('Error in updateSeminarDates:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Admin: Recalculating all seminar dates');

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin verified, proceeding with recalculation');

    // Get all seminars
    const { data: seminars, error: seminarsError } = await supabase
      .from('seminars')
      .select('id, title');

    if (seminarsError) {
      console.error('❌ Error fetching seminars:', seminarsError);
      return NextResponse.json({ error: 'Failed to fetch seminars' }, { status: 500 });
    }

    console.log(`📊 Found ${seminars?.length || 0} seminars to update`);

    const results = [];

    // Update each seminar
    for (const seminar of seminars || []) {
      console.log(`🔄 Processing seminar: ${seminar.title} (${seminar.id})`);
      
      const result = await updateSeminarDates(seminar.id, supabase);
      results.push({
        seminarId: seminar.id,
        title: seminar.title,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`✅ Recalculation complete: ${successCount} success, ${failureCount} failures`);

    return NextResponse.json({
      message: 'Seminar date recalculation completed',
      summary: {
        total: results.length,
        success: successCount,
        failures: failureCount
      },
      results
    });

  } catch (error) {
    console.error('❌ Admin Recalculate API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 