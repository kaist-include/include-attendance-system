import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's enrolled seminars
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('seminar_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    const seminarIds = enrollments?.map(e => e.seminar_id) || [];

    // Fetch recent announcements
    // Include both global announcements and announcements for user's enrolled seminars
    let orCondition = 'is_global.eq.true';
    if (seminarIds.length > 0) {
      orCondition += `,seminar_id.in.(${seminarIds.join(',')})`;
    }

    const { data: announcements, error } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        is_global,
        is_pinned,
        created_at,
        seminar_id,
        seminars (
          title
        ),
        created_by,
        users (
          name
        )
      `)
      .or(orCondition)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    // Transform announcements with time formatting
    const transformedAnnouncements = announcements?.map(announcement => {
      const createdAt = new Date(announcement.created_at);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      
      let timeAgo;
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        timeAgo = `${diffInMinutes}분 전`;
      } else if (diffInHours < 24) {
        timeAgo = `${diffInHours}시간 전`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        timeAgo = `${diffInDays}일 전`;
      }

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        time: timeAgo,
        isNew: diffInHours < 24, // Mark as new if posted within last 24 hours
        isGlobal: announcement.is_global,
        isPinned: announcement.is_pinned,
        seminarTitle: Array.isArray(announcement.seminars) 
          ? announcement.seminars[0]?.title 
          : (announcement.seminars as any)?.title,
        authorName: Array.isArray(announcement.users) 
          ? announcement.users[0]?.name 
          : (announcement.users as any)?.name
      };
    }) || [];

    return NextResponse.json(transformedAnnouncements);

  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
} 