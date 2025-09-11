import { createClient } from '@/utils/supabase/server';
import { NotificationType } from '@/types';

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  seminar_id?: string;
  session_id?: string;
  enrollment_id?: string;
}

/**
 * Send a notification to a specific user
 */
export async function sendNotification(data: NotificationData) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        seminar_id: data.seminar_id || null,
        session_id: data.session_id || null,
        enrollment_id: data.enrollment_id || null,
      });

    if (error) {
      console.error('Error sending notification:', error);
      return false;
    }

    console.log('✅ Notification sent:', data.title);
    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendBulkNotifications(notifications: NotificationData[]) {
  try {
    const supabase = await createClient();
    
    const notificationRecords = notifications.map(data => ({
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      seminar_id: data.seminar_id || null,
      session_id: data.session_id || null,
      enrollment_id: data.enrollment_id || null,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notificationRecords);

    if (error) {
      console.error('Error sending bulk notifications:', error);
      return false;
    }

    console.log(`✅ ${notifications.length} notifications sent`);
    return true;
  } catch (error) {
    console.error('Failed to send bulk notifications:', error);
    return false;
  }
}

/**
 * Send enrollment approval notification
 */
export async function sendEnrollmentApprovedNotification(
  userId: string,
  seminarTitle: string,
  seminarId: string,
  enrollmentId: string
) {
  return sendNotification({
    user_id: userId,
    title: '세미나 신청이 승인되었습니다!',
    message: `"${seminarTitle}" 세미나 신청이 승인되었습니다. 이제 세미나에 참여하실 수 있습니다.`,
    type: 'enrollment_approved',
    seminar_id: seminarId,
    enrollment_id: enrollmentId,
  });
}

/**
 * Send enrollment rejection notification
 */
export async function sendEnrollmentRejectedNotification(
  userId: string,
  seminarTitle: string,
  seminarId: string,
  enrollmentId: string
) {
  return sendNotification({
    user_id: userId,
    title: '세미나 신청이 거절되었습니다',
    message: `"${seminarTitle}" 세미나 신청이 거절되었습니다. 다른 세미나를 확인해보세요.`,
    type: 'enrollment_rejected',
    seminar_id: seminarId,
    enrollment_id: enrollmentId,
  });
}

/**
 * Send announcement notification to all users
 */
export async function sendAnnouncementNotification(
  title: string,
  content: string,
  isGlobal: boolean = true,
  seminarId?: string
) {
  try {
    const supabase = await createClient();
    
    let userQuery = supabase.from('users').select('id');
    
    // If it's a seminar-specific announcement, only notify enrolled users
    if (!isGlobal && seminarId) {
      const { data: enrolledUsers } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('seminar_id', seminarId)
        .eq('status', 'approved');
      
      if (!enrolledUsers || enrolledUsers.length === 0) {
        return true; // No users to notify
      }
      
      const userIds = enrolledUsers.map(e => e.user_id);
      userQuery = userQuery.in('id', userIds);
    }
    
    const { data: users, error: usersError } = await userQuery;
    
    if (usersError || !users) {
      console.error('Error fetching users for announcement:', usersError);
      return false;
    }

    const notifications: NotificationData[] = users.map(user => ({
      user_id: user.id,
      title: '새로운 공지사항',
      message: `${title}: ${content.length > 100 ? content.substring(0, 100) + '...' : content}`,
      type: 'announcement',
      seminar_id: seminarId,
    }));

    return sendBulkNotifications(notifications);
  } catch (error) {
    console.error('Failed to send announcement notifications:', error);
    return false;
  }
}

/**
 * Send session reminder notification
 */
export async function sendSessionReminderNotification(
  userId: string,
  sessionTitle: string,
  seminarTitle: string,
  sessionDate: string,
  sessionId: string,
  seminarId: string
) {
  const sessionDateTime = new Date(sessionDate);
  const formattedDate = sessionDateTime.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return sendNotification({
    user_id: userId,
    title: '세션 시작 알림',
    message: `"${seminarTitle}" - "${sessionTitle}" 세션이 ${formattedDate}에 시작됩니다.`,
    type: 'session_reminder',
    seminar_id: seminarId,
    session_id: sessionId,
  });
}

/**
 * Send seminar updated notification
 */
export async function sendSeminarUpdatedNotification(
  seminarId: string,
  seminarTitle: string,
  updateDescription: string
) {
  try {
    const supabase = await createClient();
    
    // Get all enrolled users
    const { data: enrolledUsers, error } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('seminar_id', seminarId)
      .eq('status', 'approved');
    
    if (error || !enrolledUsers || enrolledUsers.length === 0) {
      return true; // No users to notify
    }

    const notifications: NotificationData[] = enrolledUsers.map(enrollment => ({
      user_id: enrollment.user_id,
      title: '세미나 정보가 업데이트되었습니다',
      message: `"${seminarTitle}" 세미나가 업데이트되었습니다: ${updateDescription}`,
      type: 'seminar_updated',
      seminar_id: seminarId,
    }));

    return sendBulkNotifications(notifications);
  } catch (error) {
    console.error('Failed to send seminar update notifications:', error);
    return false;
  }
}

/**
 * Send attendance marked notification (for students when marked by instructor)
 */
export async function sendAttendanceMarkedNotification(
  userId: string,
  sessionTitle: string,
  seminarTitle: string,
  status: string,
  sessionId: string,
  seminarId: string
) {
  const statusText = status === 'present' ? '출석' : status === 'absent' ? '결석' : '지각';
  
  return sendNotification({
    user_id: userId,
    title: '출석이 체크되었습니다',
    message: `"${seminarTitle}" - "${sessionTitle}" 세션에서 ${statusText} 처리되었습니다.`,
    type: 'attendance_marked',
    seminar_id: seminarId,
    session_id: sessionId,
  });
}

/**
 * Send seminar created notification (to all users about new seminar)
 */
export async function sendSeminarCreatedNotification(
  seminarId: string,
  seminarTitle: string,
  ownerName: string,
  description: string
) {
  try {
    const supabase = await createClient();
    
    // Get all users except the creator
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');
    
    if (usersError || !users) {
      console.error('Error fetching users for seminar creation notification:', usersError);
      return false;
    }

    const notifications: NotificationData[] = users.map(user => ({
      user_id: user.id,
      title: '새로운 세미나가 개설되었습니다',
      message: `${ownerName}님이 "${seminarTitle}" 세미나를 개설했습니다. ${description.length > 50 ? description.substring(0, 50) + '...' : description}`,
      type: 'seminar_updated',
      seminar_id: seminarId,
    }));

    return sendBulkNotifications(notifications);
  } catch (error) {
    console.error('Failed to send seminar creation notifications:', error);
    return false;
  }
}

/**
 * Send seminar deleted notification (to enrolled users)
 */
export async function sendSeminarDeletedNotification(
  seminarId: string,
  seminarTitle: string,
  enrolledUserIds: string[]
) {
  if (enrolledUserIds.length === 0) return true;

  const notifications: NotificationData[] = enrolledUserIds.map(userId => ({
    user_id: userId,
    title: '세미나가 취소되었습니다',
    message: `"${seminarTitle}" 세미나가 개설자에 의해 취소되었습니다. 다른 세미나를 확인해보세요.`,
    type: 'seminar_updated',
    seminar_id: seminarId,
  }));

  return sendBulkNotifications(notifications);
}

/**
 * Send session created notification (to enrolled users)
 */
export async function sendSessionCreatedNotification(
  seminarId: string,
  seminarTitle: string,
  sessionTitle: string,
  sessionDate: string,
  sessionId: string
) {
  try {
    const supabase = await createClient();
    
    // Get all enrolled users
    const { data: enrolledUsers, error } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('seminar_id', seminarId)
      .eq('status', 'approved');
    
    if (error || !enrolledUsers || enrolledUsers.length === 0) {
      return true; // No users to notify
    }

    const sessionDateTime = new Date(sessionDate);
    const formattedDate = sessionDateTime.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notifications: NotificationData[] = enrolledUsers.map(enrollment => ({
      user_id: enrollment.user_id,
      title: '새로운 세션이 추가되었습니다',
      message: `"${seminarTitle}" 세미나에 "${sessionTitle}" 세션이 ${formattedDate}에 추가되었습니다.`,
      type: 'session_reminder',
      seminar_id: seminarId,
      session_id: sessionId,
    }));

    return sendBulkNotifications(notifications);
  } catch (error) {
    console.error('Failed to send session creation notifications:', error);
    return false;
  }
}

/**
 * Send session updated notification (to enrolled users)
 */
export async function sendSessionUpdatedNotification(
  seminarId: string,
  seminarTitle: string,
  sessionTitle: string,
  sessionId: string,
  updateDescription: string
) {
  try {
    const supabase = await createClient();
    
    // Get all enrolled users
    const { data: enrolledUsers, error } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('seminar_id', seminarId)
      .eq('status', 'approved');
    
    if (error || !enrolledUsers || enrolledUsers.length === 0) {
      return true; // No users to notify
    }

    const notifications: NotificationData[] = enrolledUsers.map(enrollment => ({
      user_id: enrollment.user_id,
      title: '세션 정보가 변경되었습니다',
      message: `"${seminarTitle}" - "${sessionTitle}" 세션 정보가 변경되었습니다: ${updateDescription}`,
      type: 'session_reminder',
      seminar_id: seminarId,
      session_id: sessionId,
    }));

    return sendBulkNotifications(notifications);
  } catch (error) {
    console.error('Failed to send session update notifications:', error);
    return false;
  }
}

/**
 * Send session deleted notification (to enrolled users)
 */
export async function sendSessionDeletedNotification(
  seminarId: string,
  seminarTitle: string,
  sessionTitle: string,
  enrolledUserIds: string[]
) {
  if (enrolledUserIds.length === 0) return true;

  const notifications: NotificationData[] = enrolledUserIds.map(userId => ({
    user_id: userId,
    title: '세션이 취소되었습니다',
    message: `"${seminarTitle}" - "${sessionTitle}" 세션이 취소되었습니다.`,
    type: 'session_reminder',
    seminar_id: seminarId,
  }));

  return sendBulkNotifications(notifications);
}

/**
 * Send user role changed notification
 */
export async function sendUserRoleChangedNotification(
  userId: string,
  newRole: 'admin' | 'member'
) {
  const roleText = newRole === 'admin' ? '관리자' : '일반 회원';
  
  return sendNotification({
    user_id: userId,
    title: '계정 권한이 변경되었습니다',
    message: `계정 권한이 ${roleText}로 변경되었습니다.`,
    type: 'announcement',
  });
}

/**
 * Send seminar permission granted notification
 */
export async function sendSeminarPermissionGrantedNotification(
  userId: string,
  seminarTitle: string,
  seminarId: string,
  role: string
) {
  const roleText = role === 'manager' ? '관리자' : role === 'assistant' ? '보조 관리자' : role;
  
  return sendNotification({
    user_id: userId,
    title: '세미나 권한이 부여되었습니다',
    message: `"${seminarTitle}" 세미나의 ${roleText} 권한이 부여되었습니다.`,
    type: 'announcement',
    seminar_id: seminarId,
  });
} 