'use client';

import { useEffect, useState } from 'react';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatsSkeleton, AnnouncementsSkeleton, SessionsSkeleton } from '@/components/ui/skeleton';
import { Calendar, Users, BookOpen, TrendingUp, Clock, Award, Bell, Loader2, Eye } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { DashboardStats, DashboardAnnouncement } from '@/types';

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
  const { profile, userRole } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [weekRangeLabel, setWeekRangeLabel] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<DashboardAnnouncement | null>(null);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);

  useEffect(() => {
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setWeekRangeLabel(end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }));
  }, []);

  // Fetch all dashboard data in parallel once user is available
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetchAllDashboardData = async () => {
      console.log('🚀 Starting dashboard data fetch for user:', user.email);
      
      try {
        // Start all API calls in parallel for better performance
        const [statsPromise, announcementsPromise, sessionsPromise] = [
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/announcements'),
          fetch('/api/sessions/upcoming')
        ];

        // Handle stats
        statsPromise.then(async (response) => {
          if (cancelled) return;
          try {
            if (response.ok) {
              const data = await response.json();
              if (!cancelled) {
                setStats(data);
                console.log('✅ Dashboard stats loaded');
              }
            } else {
              console.error('Failed to fetch dashboard stats:', response.status);
            }
          } catch (error) {
            console.error('Error processing dashboard stats:', error);
          } finally {
            if (!cancelled) setStatsLoading(false);
          }
        }).catch(error => {
          if (!cancelled) {
            console.error('Error fetching dashboard stats:', error);
            setStatsLoading(false);
          }
        });

        // Handle announcements
        announcementsPromise.then(async (response) => {
          if (cancelled) return;
          try {
            if (response.ok) {
              const data = await response.json();
              if (!cancelled) {
                setAnnouncements(data);
                console.log('✅ Dashboard announcements loaded');
              }
            } else {
              console.error('Failed to fetch announcements:', response.status);
            }
          } catch (error) {
            console.error('Error processing announcements:', error);
          } finally {
            if (!cancelled) setAnnouncementsLoading(false);
          }
        }).catch(error => {
          if (!cancelled) {
            console.error('Error fetching announcements:', error);
            setAnnouncementsLoading(false);
          }
        });

        // Handle sessions
        sessionsPromise.then(async (response) => {
          if (cancelled) return;
          try {
            if (response.ok) {
              const data = await response.json();
              if (!cancelled) {
                setUpcomingSessions(data);
                console.log('✅ Upcoming sessions loaded');
              }
            } else {
              const errorText = await response.text();
              console.error('Failed to fetch upcoming sessions:', response.status, errorText);
            }
          } catch (error) {
            console.error('Error processing upcoming sessions:', error);
          } finally {
            if (!cancelled) setSessionsLoading(false);
          }
        }).catch(error => {
          if (!cancelled) {
            console.error('Error fetching upcoming sessions:', error);
            setSessionsLoading(false);
          }
        });

      } catch (error) {
        console.error('Error starting dashboard data fetch:', error);
        // Set all loading states to false on error
        if (!cancelled) {
          setStatsLoading(false);
          setAnnouncementsLoading(false);
          setSessionsLoading(false);
        }
      }
    };

    fetchAllDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Show loading only for initial auth, not for dashboard data
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            인증 확인 중...
          </p>
        </div>
      </div>
    );
  }

  // Show dashboard immediately once user is authenticated
  // Individual sections will show their own loading states

  // 통계 카드 데이터 구성
  const statsCards = [
    {
      title: '참여 중인 세미나',
      value: statsLoading ? '-' : (stats?.currentSeminars?.toString() || '0'),
      description: stats?.currentSemester ? `${stats.currentSemester} 학기` : '이번 학기',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '평균 출석률',
      value: statsLoading ? '-%' : `${stats?.attendanceRate || 0}%`,
      description: '지난 4주',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '다음 세션',
      value: sessionsLoading ? '-' : upcomingSessions.length.toString(),
      description: '이번 주',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: '완료한 세미나',
      value: statsLoading ? '-' : (stats?.completedSeminars?.toString() || '0'),
      description: '전체 기간',
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
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
          {statsLoading ? (
            <StatsSkeleton />
          ) : (
            statsCards.map((stat, index) => {
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
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    {/* Add Progress bar for attendance rate */}
                    {index === 1 && !statsLoading && (
                      <Progress 
                        value={stats?.attendanceRate || 0} 
                        className="mt-3 h-2 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-600"
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
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
                <SessionsSkeleton />
              ) : (
                <>
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{session.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{session.session}</p>
                          <p className="text-sm text-foreground/90 mt-1 font-medium">{session.sessionTitle}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
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
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
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
              {announcementsLoading ? (
                <AnnouncementsSkeleton />
              ) : (
                <>
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="border border-border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
                        setAnnouncementDialogOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h3 className="font-medium text-foreground">{announcement.title}</h3>
                            {announcement.isPinned && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">
                                고정
                              </Badge>
                            )}
                            {announcement.isNew && (
                              <Badge variant="secondary">
                                NEW
                              </Badge>
                            )}
                            {announcement.isGlobal && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
                                전체 공지
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                            <span>{announcement.time}</span>
                            {announcement.seminarTitle && (
                              <>
                                <span>•</span>
                                <span>{announcement.seminarTitle}</span>
                              </>
                            )}
                            {announcement.authorName && (
                              <>
                                <span>•</span>
                                <span>{announcement.authorName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {announcements.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>새로운 공지사항이 없습니다</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>


      </div>

      {/* Announcement Detail Dialog */}
      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>{selectedAnnouncement?.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAnnouncement && (
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex items-center space-x-2 flex-wrap">
                {selectedAnnouncement.isPinned && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">
                    고정
                  </Badge>
                )}
                {selectedAnnouncement.isNew && (
                  <Badge variant="secondary">
                    NEW
                  </Badge>
                )}
                {selectedAnnouncement.isGlobal && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
                    전체 공지
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {selectedAnnouncement.content}
                </div>
              </div>

              {/* Meta Information */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{selectedAnnouncement.time}</span>
                  </div>
                  {selectedAnnouncement.authorName && (
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{selectedAnnouncement.authorName}</span>
                    </div>
                  )}
                  {selectedAnnouncement.seminarTitle && (
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{selectedAnnouncement.seminarTitle}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
} 