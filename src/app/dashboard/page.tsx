'use client';

import { useEffect, useState } from 'react';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, BookOpen, TrendingUp, Clock, Award, Bell, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface UpcomingSession {
  id: string;
  title: string;
  session: string;
  sessionTitle: string;
  date: string;
  time: string;
  location: string;
  description?: string;
}

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const { profile } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [weekRangeLabel, setWeekRangeLabel] = useState<string>("");

  useEffect(() => {
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setWeekRangeLabel(end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }));
  }, []);



  // Fetch upcoming sessions
  useEffect(() => {
    let cancelled = false;
    
    const fetchUpcomingSessions = async () => {
      if (!user?.id || cancelled) {
        if (!cancelled) setSessionsLoading(false);
        return;
      }
      
      try {
        setSessionsLoading(true);
        
        // With SSR pattern, auth is handled automatically by middleware
        if (!user?.id || cancelled) {
          if (!cancelled) setSessionsLoading(false);
          return;
        }

        const response = await fetch('/api/sessions/upcoming', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setUpcomingSessions(data);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch upcoming sessions:', response.status, errorText);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching upcoming sessions:', error);
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      }
    };

    fetchUpcomingSessions();

    // Cleanup function to cancel the request if component unmounts or effect re-runs
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // Use user.id instead of user object to reduce re-renders

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 임시 데이터 (실제로는 API에서 가져올 데이터) - TODO: 실제 통계 API 구현
  const stats = [
    {
      title: '참여 중인 세미나',
      value: '0', // TODO: 실제 데이터로 교체
      description: '이번 학기',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '평균 출석률',
      value: '-%', // TODO: 실제 데이터로 교체
      description: '지난 4주',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '다음 세션',
      value: upcomingSessions.length.toString(),
      description: '이번 주',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: '완료한 세미나',
      value: '0', // TODO: 실제 데이터로 교체
      description: '전체 기간',
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const recentAnnouncements = [
    {
      id: 1,
      title: '[공지] 2월 정기 세미나 일정 변경',
      content: '2월 둘째 주 세미나가 2월 15일로 변경되었습니다.',
      time: '2시간 전',
      isNew: true,
    },
    {
      id: 2,
      title: 'React 세미나 과제 제출 안내',
      content: '5회차 세미나 과제를 2월 5일까지 제출해주세요.',
      time: '5시간 전',
      isNew: false,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
          <p className="text-muted-foreground mt-2">
            안녕하세요, <span className="font-medium" suppressHydrationWarning>{profile?.nickname || user.email}</span>님!
            오늘도 활발한 학습 활동을 시작해보세요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 다가오는 세션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>다가오는 세션</span>
              </CardTitle>
              <CardDescription>
                이번 주(~<span suppressHydrationWarning>{weekRangeLabel}</span>) 참여 예정인 세미나 세션입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">세션을 불러오는 중...</span>
                </div>
              ) : (
                <>
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{session.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{session.session}</p>
                          <p className="text-sm text-gray-700 mt-1 font-medium">{session.sessionTitle}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{session.date}</span>
                            <span>{session.time}</span>
                            <span>{session.location}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          상세보기
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {upcomingSessions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>다가오는 세션이 없습니다</p>
                      <p className="text-sm mt-1">세미나에 신청하여 세션에 참여해보세요</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 최근 공지사항 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-green-600" />
                <span>최근 공지사항</span>
              </CardTitle>
              <CardDescription>
                놓치면 안 되는 중요한 소식들입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{announcement.title}</h3>
                        {announcement.isNew && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">{announcement.time}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {recentAnnouncements.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>새로운 공지사항이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 빠른 액션 */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 액션</CardTitle>
            <CardDescription>
              자주 사용하는 기능들에 빠르게 접근하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-16 flex-col space-y-2">
                <BookOpen className="w-5 h-5" />
                <span>세미나 둘러보기</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col space-y-2">
                <Users className="w-5 h-5" />
                <span>내 신청 현황</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col space-y-2">
                <TrendingUp className="w-5 h-5" />
                <span>출석 현황</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col space-y-2">
                <Bell className="w-5 h-5" />
                <span>알림 설정</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 