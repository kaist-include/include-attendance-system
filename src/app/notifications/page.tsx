'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, User, Check, X, Calendar, BookOpen, MessageSquare, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MainLayout from '@/components/layout/MainLayout';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'enrollment_approved':
      return <Check className="w-5 h-5 text-green-600" />;
    case 'enrollment_rejected':
      return <X className="w-5 h-5 text-red-600" />;
    case 'session_reminder':
      return <Calendar className="w-5 h-5 text-blue-600" />;
    case 'seminar_updated':
      return <BookOpen className="w-5 h-5 text-purple-600" />;
    case 'announcement':
      return <MessageSquare className="w-5 h-5 text-orange-600" />;
    case 'attendance_marked':
      return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    default:
      return <Bell className="w-5 h-5 text-gray-600" />;
  }
}

function getNotificationTypeText(type: string) {
  switch (type) {
    case 'enrollment_approved':
      return '등록 승인';
    case 'enrollment_rejected':
      return '등록 거부';
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
}

function NotificationItem({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: Notification; 
  onMarkAsRead: (id: string) => void;
}) {
  const isUnread = !notification.read_at;

  return (
    <div 
      className={`p-4 border rounded-lg transition-colors ${
        isUnread 
          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-start justify-between space-x-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-foreground line-clamp-1">
                {notification.title}
              </h3>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {getNotificationTypeText(notification.type)}
              </Badge>
              {isUnread && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {notification.message}
            </p>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true, 
                locale: ko 
              })}
            </div>
          </div>
        </div>
        {isUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkAsRead(notification.id)}
            className="flex-shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.read_at;
    if (activeTab === 'read') return notification.read_at;
    return true;
  });

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header matching other pages */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">알림</h1>
            <p className="text-muted-foreground mt-2">
              읽지 않은 알림 {unreadCount}개 • 모든 알림을 확인하고 관리하세요
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" className="mt-4 md:mt-0">
              <CheckCheck className="w-4 h-4 mr-2" />
              모두 읽음 처리
            </Button>
          )}
        </div>

        {/* Notification Tabs wrapped in Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>알림 목록</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread' | 'read')}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="all" className="flex items-center space-x-2">
                  <span>전체</span>
                  <Badge variant="secondary" className="text-xs">
                    {notifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex items-center space-x-2">
                  <span>읽지 않음</span>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read" className="flex items-center space-x-2">
                  <span>읽음</span>
                  <Badge variant="outline" className="text-xs">
                    {notifications.length - unreadCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={(id) => markAsRead([id])}
                    />
                  ))
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {activeTab === 'unread' && '읽지 않은 알림이 없습니다'}
                      {activeTab === 'read' && '읽은 알림이 없습니다'}
                      {activeTab === 'all' && '알림이 없습니다'}
                    </h3>
                    <p className="text-muted-foreground">
                      {activeTab === 'all' && '새로운 알림이 도착하면 여기에 표시됩니다.'}
                      {activeTab === 'unread' && '모든 알림을 확인하셨습니다.'}
                      {activeTab === 'read' && '읽은 알림이 없습니다.'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 