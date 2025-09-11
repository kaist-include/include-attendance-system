import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST - Create test notifications for development
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sample notifications to create
    const sampleNotifications = [
      {
        user_id: user.id,
        title: '세미나 등록이 승인되었습니다',
        message: 'React 개발 기초 세미나에 등록이 승인되었습니다. 첫 번째 세션은 내일 오후 2시에 시작됩니다.',
        type: 'enrollment_approved',
      },
      {
        user_id: user.id,
        title: '세션 시작 1시간 전입니다',
        message: 'JavaScript 심화 과정 세션이 1시간 후에 시작됩니다. 준비해주세요!',
        type: 'session_reminder',
      },
      {
        user_id: user.id,
        title: '새로운 공지사항',
        message: '다음 주 세미나 일정이 변경되었습니다. 자세한 내용은 세미나 페이지를 확인해주세요.',
        type: 'announcement',
      },
      {
        user_id: user.id,
        title: '세미나 정보가 업데이트되었습니다',
        message: 'Node.js 백엔드 개발 세미나의 교육 자료가 업데이트되었습니다.',
        type: 'seminar_updated',
      },
    ];

    // Insert sample notifications
    const { data: createdNotifications, error } = await supabase
      .from('notifications')
      .insert(sampleNotifications)
      .select();

    if (error) {
      console.error('Error creating test notifications:', error);
      return NextResponse.json({ error: 'Failed to create test notifications' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Test notifications created successfully',
      notifications: createdNotifications 
    });

  } catch (error) {
    console.error('Error in test-create POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 