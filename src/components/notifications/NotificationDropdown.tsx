'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Bell, 
  X, 
  Check, 
  Calendar, 
  Users, 
  AlertCircle,
  MessageSquare,
  BookOpen,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Notification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (notificationIds: string[]) => void;
  onMarkAllAsRead: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'enrollment_approved':
      return <Check className="w-4 h-4 text-green-600" />;
    case 'enrollment_rejected':
      return <X className="w-4 h-4 text-red-600" />;
    case 'session_reminder':
      return <Calendar className="w-4 h-4 text-blue-600" />;
    case 'seminar_updated':
      return <BookOpen className="w-4 h-4 text-purple-600" />;
    case 'announcement':
      return <MessageSquare className="w-4 h-4 text-orange-600" />;
    case 'attendance_marked':
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    default:
      return <Bell className="w-4 h-4 text-gray-600" />;
  }
};

const getNotificationTypeText = (type: NotificationType) => {
  switch (type) {
    case 'enrollment_approved':
      return '등록 승인';
    case 'enrollment_rejected':
      return '등록 거절';
    case 'session_reminder':
      return '세션 알림';
    case 'seminar_updated':
      return '세미나 업데이트';
    case 'announcement':
      return '공지사항';
    case 'attendance_marked':
      return '출석 체크';
    default:
      return '알림';
  }
};

export function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      onMarkAsRead([notification.id]);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      onMarkAllAsRead();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent"
          aria-label={`알림 ${unreadCount}개`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="end" 
        side="bottom"
        sideOffset={8}
        alignOffset={-4}
      >
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-sm text-muted-foreground hover:text-foreground h-auto p-1"
            >
              모두 읽음
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                새로운 알림이 없습니다
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-accent/50 cursor-pointer transition-colors border-l-2 border-l-transparent hover:border-l-accent-foreground/20",
                    !notification.read_at && "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs h-5"
                        >
                          {getNotificationTypeText(notification.type)}
                        </Badge>
                        {!notification.read_at && (
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      
                      <h4 className="text-sm font-medium leading-tight mb-1 line-clamp-2">
                        {notification.title}
                      </h4>
                      
                      <p className="text-xs text-muted-foreground leading-tight mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/25">
            <Link href="/notifications">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-muted-foreground hover:text-foreground justify-center"
                onClick={() => setOpen(false)}
              >
                <span>모든 알림 보기</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 