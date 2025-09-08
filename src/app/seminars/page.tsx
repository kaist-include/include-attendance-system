'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Calendar, Users, Clock, MapPin, Tag, GraduationCap, Loader2, BookOpen } from 'lucide-react';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/constants';
import { createClient } from '@/utils/supabase/client';
import { formatSemesterLabel } from '@/lib/utils';

interface Seminar {
  id: string;
  title: string;
  description: string;
  instructor: string;
  startDate: string;
  endDate: string | null;
  capacity: number;
  enrolled: number;
  location: string | null;
  tags: string[];
  status: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
  sessions: number;
  semester: string;
  applicationStart: string;
  applicationEnd: string;
  applicationType: 'first_come' | 'selection';
  currentUserEnrollment: {
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    applied_at: string;
  } | null;
}

const statusLabels = {
  draft: {
    label: '준비중',
    color:
      'bg-muted text-foreground/90 ring-1 ring-inset ring-border',
  },
  recruiting: {
    label: '모집중',
    color:
      'bg-green-500/15 text-green-600 dark:text-green-300 ring-1 ring-inset ring-green-500/30',
  },
  in_progress: {
    label: '진행중',
    color:
      'bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-1 ring-inset ring-blue-500/30',
  },
  completed: {
    label: '완료',
    color:
      'bg-muted text-foreground/80 ring-1 ring-inset ring-border',
  },
  cancelled: {
    label: '취소',
    color:
      'bg-red-500/15 text-red-600 dark:text-red-300 ring-1 ring-inset ring-red-500/30',
  },
};

export default function SeminarsPage() {
  const { user } = useRequireAuth(); // Changed from useAuth to useRequireAuth to require authentication
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Fetch seminars from API
  useEffect(() => {
    const fetchSeminars = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        if (selectedTags.length > 0) {
          params.append('tags', selectedTags.join(','));
        }

        // With SSR middleware, auth is handled automatically
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        const response = await fetch(`/api/seminars?${params.toString()}`, {
          method: 'GET',
          headers,
        });
        
        if (response.ok) {
          const data = await response.json();
          // Ensure data is an array
          if (Array.isArray(data)) {
          setSeminars(data);
          } else {
            console.error('API returned non-array data:', data);
            setSeminars([]);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch seminars:', response.status, errorText);
          setSeminars([]); // Ensure we have an empty array on error
        }
      } catch (error) {
        console.error('Error fetching seminars:', error);
        setSeminars([]); // Ensure we have an empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchSeminars();
  }, [statusFilter, searchTerm, selectedTags]);

  // 모든 태그 수집 - with safe array check
  const allTags = Array.from(new Set((seminars || []).flatMap(seminar => seminar.tags || [])));
  const allSemesters = Array.from(new Set((seminars || []).map(seminar => (seminar as any).semester).filter(Boolean)));

  // Client-side filtering is now done by the API, but we keep this for immediate UI feedback
  const filteredSeminars = (seminars || []).filter(seminar => {
    const matchesSemester = semesterFilter === 'all' || (seminar as any).semester === semesterFilter;
    return matchesSemester;
  });

  const groupedBySemester = useMemo(() => {
    return filteredSeminars.reduce((acc: Record<string, Seminar[]>, s: any) => {
      const sem = s.semester || '기타';
      (acc[sem] ||= []).push(s);
      return acc;
    }, {} as Record<string, Seminar[]>);
  }, [filteredSeminars]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Helper function to check if application is open
  const isApplicationOpen = (seminar: Seminar) => {
    const now = new Date();
    const appStart = new Date(seminar.applicationStart);
    const appEnd = new Date(seminar.applicationEnd);
    return now >= appStart && now <= appEnd;
  };

  // Helper function to check if user can apply
  const canUserApply = (seminar: Seminar) => {
    if (!user) return false;
    if (seminar.currentUserEnrollment) return false; // Already applied/enrolled
    if (seminar.enrolled >= seminar.capacity) return false; // Full capacity
    if (seminar.status !== 'recruiting') return false; // Not recruiting
    if (!isApplicationOpen(seminar)) return false; // Application period closed
    return true;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">세미나</h1>
            <p className="text-muted-foreground mt-2">
              다양한 주제의 세미나와 스터디에 참여해보세요
            </p>
          </div>
          {user && (
            <Link href={ROUTES.createSeminar}>
              <Button className="mt-4 md:mt-0">세미나 개설하기</Button>
            </Link>
          )}
        </div>

        {/* 검색 및 필터 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 검색바 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 opacity-80" />
                <input
                  type="text"
                  placeholder="세미나 제목, 설명, 강사명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-colors placeholder:text-muted-foreground"
                />
              </div>

              {/* 필터 */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* 상태 필터 */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  >
                    <option key="all-status" value="all">모든 상태</option>
                    <option key="draft" value="draft">준비중</option>
                    <option key="in_progress" value="in_progress">진행중</option>
                    <option key="completed" value="completed">완료</option>
                    <option key="cancelled" value="cancelled">취소</option>
                  </select>
                </div>

                {/* 학기 필터 */}
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  >
                    <option key="all-semester" value="all">모든 학기</option>
                    {allSemesters.map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                {/* 태그 필터 */}
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-secondary text-foreground border border-border'
                          : 'bg-muted text-muted-foreground border border-border hover:bg-accent'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 세미나 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">세미나를 불러오는 중...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSeminars.map((seminar) => (
            <Card key={seminar.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{seminar.title}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 mb-2">
                      담당자: <span className="font-medium">{seminar.instructor}</span>
                    </div>
                    <CardDescription className="text-base">
                      {seminar.description}
                    </CardDescription>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[seminar.status].color}`}>
                    {statusLabels[seminar.status].label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 기본 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {seminar.startDate 
                        ? new Date(seminar.startDate).toLocaleDateString('ko-KR') 
                        : '시작일 미정'} ~ {' '}
                      {seminar.endDate 
                        ? new Date(seminar.endDate).toLocaleDateString('ko-KR') 
                        : '진행중'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{seminar.location || '장소 미정'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>총 {seminar.sessions}회차</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    <span>학기: <span className="font-medium text-foreground/90">{formatSemesterLabel(seminar.semester)}</span></span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    <span>
                      신청: {new Date(seminar.applicationStart).toLocaleDateString('ko-KR')} ~ {new Date(seminar.applicationEnd).toLocaleDateString('ko-KR')}
                      {isApplicationOpen(seminar) && (
                        <span className="ml-2 text-green-600 font-medium">• 신청 가능</span>
                      )}
                    </span>
                  </div>
                </div>

                        {/* 정원 정보 */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">신청 현황</span>
                            <span className="font-medium">
                              {seminar.enrolled}/{seminar.capacity}명
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                seminar.enrolled >= seminar.capacity 
                                  ? 'bg-destructive' 
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min((seminar.enrolled / seminar.capacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                {/* 태그 */}
                <div className="flex flex-wrap gap-1">
                  {seminar.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground/90 ring-1 ring-inset ring-border"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 액션 버튼 */}
                <div className="flex space-x-2 pt-2">
                  <Link href={ROUTES.seminarDetail(seminar.id.toString())} className="flex-1">
                    <Button variant="outline" className="w-full">
                      상세보기
                    </Button>
                  </Link>
                  {user && (() => {
                    // Show different buttons based on user's status and application conditions
                    if (seminar.currentUserEnrollment) {
                      // User already applied/enrolled
                      switch (seminar.currentUserEnrollment.status) {
                        case 'pending':
                          return <Button variant="secondary" className="flex-1" disabled>승인 대기중</Button>;
                        case 'approved':
                          return <Button variant="outline" className="flex-1" disabled>수강중</Button>;
                        case 'rejected':
                          return <Button variant="destructive" className="flex-1" disabled>신청 거절</Button>;
                        case 'cancelled':
                          return <Button variant="secondary" className="flex-1" disabled>신청 취소</Button>;
                      }
                                         } else if (canUserApply(seminar)) {
                       // User can apply - now all applications require owner approval
                       return (
                         <div className="flex-1 flex flex-col gap-1">
                           <Link href={ROUTES.applySeminar(seminar.id.toString())} className="w-full">
                             <Button className="w-full">신청하기</Button>
                           </Link>
                           <p className="text-xs text-muted-foreground text-center">승인 방식</p>
                         </div>
                       );
                    } else if (seminar.enrolled >= seminar.capacity) {
                      // Full capacity
                      return <Button variant="secondary" className="flex-1" disabled>정원 마감</Button>;
                    } else if (!isApplicationOpen(seminar)) {
                      // Application period closed
                      const now = new Date();
                      const appStart = new Date(seminar.applicationStart);
                      const appEnd = new Date(seminar.applicationEnd);
                      
                      if (now < appStart) {
                        return <Button variant="secondary" className="flex-1" disabled>신청 예정</Button>;
                      } else {
                        return <Button variant="secondary" className="flex-1" disabled>신청 마감</Button>;
                      }
                    } else if (seminar.status !== 'recruiting') {
                      // Not recruiting
                      return <Button variant="secondary" className="flex-1" disabled>신청 불가</Button>;
                    }
                    return null;
                  })()}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {!loading && seminars.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  세미나가 없습니다
                </h3>
                <p className="text-gray-600">
                  아직 등록된 세미나가 없거나 검색 조건에 맞는 세미나가 없습니다
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTags([]);
                    setStatusFilter('all');
                  }}
                >
                  필터 초기화
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 