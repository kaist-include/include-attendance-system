import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendSessionReminderNotification } from '@/lib/notifications';

// POST - Send session reminders for upcoming sessions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user (for admin/system checks)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can trigger session reminders)
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userRecord?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get reminder window from request (default to 24 hours)
    const { hoursAhead = 24 } = await request.json().catch(() => ({}));

    // Calculate time window for upcoming sessions
    const now = new Date();
    const reminderStart = new Date(now.getTime() + (hoursAhead - 1) * 60 * 60 * 1000); // hoursAhead - 1 hour
    const reminderEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000); // hoursAhead

    console.log(`🔔 Checking for sessions between ${reminderStart.toISOString()} and ${reminderEnd.toISOString()}`);

    // Find upcoming sessions in the specified time window
    const { data: upcomingSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        date,
        seminar_id,
        seminars (
          id,
          title,
          enrollments!inner (
            user_id,
            status
          )
        )
      `)
      .gte('date', reminderStart.toISOString())
      .lt('date', reminderEnd.toISOString())
      .eq('seminars.enrollments.status', 'approved');

    if (sessionsError) {
      console.error('Error fetching upcoming sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch upcoming sessions' }, { status: 500 });
    }

    if (!upcomingSessions || upcomingSessions.length === 0) {
      return NextResponse.json({ 
        message: 'No upcoming sessions found in the specified time window',
        remindersSent: 0 
      });
    }

    let totalRemindersSent = 0;

    // Send reminders for each session
    for (const session of upcomingSessions) {
      // Handle seminars - it could be an array or single object
      const seminar = Array.isArray(session.seminars) 
        ? session.seminars[0] 
        : session.seminars;
        
      const enrolledUsers = seminar?.enrollments || [];
      
      console.log(`📅 Sending reminders for session "${session.title}" to ${enrolledUsers.length} users`);

      for (const enrollment of enrolledUsers) {
        try {
          await sendSessionReminderNotification(
            enrollment.user_id,
            session.title,
            seminar?.title || 'Seminar',
            session.date,
            session.id,
            session.seminar_id
          );
          totalRemindersSent++;
        } catch (error) {
          console.error(`Failed to send reminder to user ${enrollment.user_id}:`, error);
        }
      }
    }

    console.log(`✅ Sent ${totalRemindersSent} session reminders`);

    return NextResponse.json({ 
      message: `Successfully sent ${totalRemindersSent} session reminders`,
      sessionsProcessed: upcomingSessions.length,
      remindersSent: totalRemindersSent
    });

  } catch (error) {
    console.error('Error in send-session-reminders POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Check upcoming sessions without sending reminders (for testing)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hoursAhead = parseInt(searchParams.get('hoursAhead') || '24');

    // Calculate time window
    const now = new Date();
    const reminderStart = new Date(now.getTime() + (hoursAhead - 1) * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    // Find upcoming sessions
    const { data: upcomingSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        date,
        seminar_id,
        seminars (
          id,
          title,
          enrollments (
            user_id,
            status
          )
        )
      `)
      .gte('date', reminderStart.toISOString())
      .lt('date', reminderEnd.toISOString());

    if (sessionsError) {
      console.error('Error fetching upcoming sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch upcoming sessions' }, { status: 500 });
    }

    const sessionsWithCounts = upcomingSessions?.map(session => {
      // Handle seminars - it could be an array or single object
      const seminar = Array.isArray(session.seminars) 
        ? session.seminars[0] 
        : session.seminars;
        
      return {
        id: session.id,
        title: session.title,
        date: session.date,
        seminar_title: seminar?.title,
        enrolled_users_count: seminar?.enrollments?.filter(e => e.status === 'approved').length || 0
      };
    }) || [];

    return NextResponse.json({
      sessions: sessionsWithCounts,
      timeWindow: {
        start: reminderStart.toISOString(),
        end: reminderEnd.toISOString(),
        hoursAhead
      }
    });

  } catch (error) {
    console.error('Error in send-session-reminders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 