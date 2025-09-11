import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEnrollmentApprovedNotification } from '@/lib/notifications';

// POST - Manually send enrollment notification (for testing/admin use)
export async function POST(request: NextRequest) {
  // Only allow in development or for admin users
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin in production
    if (process.env.NODE_ENV === 'production') {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userRecord?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required in production' }, { status: 403 });
      }
    }

    const { enrollmentId } = await request.json();
    
    if (!enrollmentId) {
      return NextResponse.json({ error: 'enrollmentId is required' }, { status: 400 });
    }

    // Get enrollment details
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        seminar_id,
        status,
        seminars (
          title
        )
      `)
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Send appropriate notification based on status
    let success = false;
    if (enrollment.status === 'approved') {
      // Handle seminars - it could be an array or single object
      const seminar = Array.isArray(enrollment.seminars) 
        ? enrollment.seminars[0] 
        : enrollment.seminars;
      
      success = await sendEnrollmentApprovedNotification(
        enrollment.user_id,
        seminar?.title || 'Seminar',
        enrollment.seminar_id,
        enrollment.id
      );
    } else {
      return NextResponse.json({ error: 'Can only send notifications for approved enrollments' }, { status: 400 });
    }

    if (success) {
      // Use the same seminar variable we defined above
      const seminar = Array.isArray(enrollment.seminars) 
        ? enrollment.seminars[0] 
        : enrollment.seminars;
        
      return NextResponse.json({ 
        message: 'Enrollment notification sent successfully',
        enrollment: {
          id: enrollment.id,
          user_id: enrollment.user_id,
          seminar_title: seminar?.title,
          status: enrollment.status
        }
      });
    } else {
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in send-enrollment-notification POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 