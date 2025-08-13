'use client';

<<<<<<< HEAD
import { useMemo, useState } from 'react';
=======
import { useState, useEffect, useMemo } from 'react';
>>>>>>> origin/master
import Link from 'next/link';
import { Search, Filter, Calendar, Users, Clock, MapPin, Tag, GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/constants';
import { supabase } from '@/lib/supabase';

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
}

const statusLabels = {
  draft: { label: '준비중', color: 'bg-gray-100 text-gray-800' },
  recruiting: { label: '모집중', color: 'bg-green-100 text-green-800' },
  in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-800' },
};

export default function SeminarsPage() {
  const { user } = useAuth();
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

        // Get session for authentication (optional - seminars should work without auth too)
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add auth header if user is logged in
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const response = await fetch(`/api/seminars?${params.toString()}`, {
          method: 'GET',
          headers,
        });
        
        if (response.ok) {
          const data = await response.json();
          setSeminars(data);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch seminars:', response.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching seminars:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeminars();
  }, [statusFilter, searchTerm, selectedTags]);

  // 모든 태그 수집
  const allTags = Array.from(new Set(seminars.flatMap(seminar => seminar.tags)));
  const allSemesters = Array.from(new Set(seminars.map(seminar => (seminar as any).semester).filter(Boolean)));

<<<<<<< HEAD
  // 필터링된 세미나
  const filteredSeminars = seminars.filter(seminar => {
    const matchesSearch = seminar.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seminar.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seminar.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => seminar.tags.includes(tag));
    
    const matchesStatus = statusFilter === 'all' || seminar.status === statusFilter;
    const matchesSemester = semesterFilter === 'all' || seminar.semester === semesterFilter;

    return matchesSearch && matchesTags && matchesStatus && matchesSemester;
  });
=======
  // Client-side filtering is now done by the API, but we keep this for immediate UI feedback
  const filteredSeminars = seminars.filter(seminar => {
    const matchesSemester = semesterFilter === 'all' || (seminar as any).semester === semesterFilter;
    return matchesSemester;
  });
>>>>>>> origin/master

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
            <Button className="mt-4 md:mt-0">
              세미나 개설하기
            </Button>
          )}
        </div>

        {/* 검색 및 필터 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 검색바 */}
              <div className="relative">
<<<<<<< HEAD
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">🔍</span>
=======
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
>>>>>>> origin/master
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
<<<<<<< HEAD
                  <span className="text-muted-foreground">🔽</span>
=======
                  <Filter className="w-4 h-4 text-gray-500" />
>>>>>>> origin/master
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  >
                    <option value="all">모든 상태</option>
                    <option value="draft">준비중</option>
                    <option value="recruiting">모집중</option>
                    <option value="in_progress">진행중</option>
                    <option value="completed">완료</option>
                    <option value="cancelled">취소</option>
                  </select>
                </div>

                {/* 학기 필터 */}
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">📚</span>
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  >
                    <option value="all">모든 학기</option>
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

<<<<<<< HEAD
        {/* 세미나 목록 (학기별 그룹) */}
        {Object.keys(groupedBySemester).length === 0 ? (
          <></>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedBySemester).sort(([a],[b]) => (a < b ? 1 : -1)).map(([sem, list]) => (
              <div key={sem} className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">{sem}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {list.map((seminar) => (
                    <Card key={seminar.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{seminar.title}</CardTitle>
                            <CardDescription className="mt-2 text-base">
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
                            <span className="mr-2">👨‍🏫</span>
                            <span>강사: {seminar.instructor}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span className="mr-2">📅</span>
                            <span>{seminar.startDate} ~ {seminar.endDate}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span className="mr-2">📍</span>
                            <span>{seminar.location}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span className="mr-2">⏰</span>
                            <span>총 {seminar.sessions}회차</span>
                          </div>
                        </div>
=======
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
                    <CardDescription className="mt-2 text-base">
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
                  <div className="flex items-center text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    <span>강사: {seminar.instructor}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {new Date(seminar.startDate).toLocaleDateString('ko-KR')} ~ {' '}
                      {seminar.endDate ? new Date(seminar.endDate).toLocaleDateString('ko-KR') : '진행중'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{seminar.location || '장소 미정'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>총 {seminar.sessions}회차</span>
                  </div>
                </div>
>>>>>>> origin/master

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

<<<<<<< HEAD
                        {/* 태그 */}
                        <div className="flex flex-wrap gap-1">
                          {seminar.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                            >
                              <span className="mr-1">🏷️</span>
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* 회차별 관리 (토글) */}
                        {seminar.sessionDetails?.length ? (
                          <div className="pt-2">
                            <Button variant="outline" onClick={() => toggleExpand(seminar.id)}>
                              {expanded[seminar.id] ? '회차 접기' : '회차 상세 보기'}
                            </Button>
                            {expanded[seminar.id] && (
                              <div className="mt-3 space-y-2">
                                {seminar.sessionDetails.map((sd: any) => (
                                  <div key={sd.number} className="border border-border rounded-lg p-3">
                                    <div className="text-sm text-muted-foreground">
                                      {sd.number}회차 · {sd.date}
                                    </div>
                                    <div className="font-medium text-foreground">{sd.title}</div>
                                    <div className="text-sm text-muted-foreground">{sd.description}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* 액션 버튼 */}
                        <div className="flex space-x-2 pt-2">
                          <Link href={ROUTES.seminarDetail(seminar.id.toString())} className="flex-1">
                            <Button variant="outline" className="w-full">
                              상세보기
                            </Button>
                          </Link>
                          {user && seminar.status === 'recruiting' && seminar.enrolled < seminar.capacity && (
                            <Button className="flex-1">
                              신청하기
                            </Button>
                          )}
                          {user && seminar.status === 'recruiting' && seminar.enrolled >= seminar.capacity && (
                            <Button variant="secondary" className="flex-1" disabled>
                              정원 마감
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
=======
                {/* 태그 */}
                <div className="flex flex-wrap gap-1">
                  {seminar.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
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
                  {user && seminar.status === 'recruiting' && seminar.enrolled < seminar.capacity && (
                    <Button className="flex-1">
                      신청하기
                    </Button>
                  )}
                  {user && seminar.status === 'recruiting' && seminar.enrolled >= seminar.capacity && (
                    <Button variant="secondary" className="flex-1" disabled>
                      정원 마감
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
>>>>>>> origin/master
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {!loading && seminars.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
<<<<<<< HEAD
                <span className="block text-6xl mb-4 opacity-30">🔍</span>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-muted-foreground">
                  다른 검색어나 필터를 시도해보세요
=======
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  세미나가 없습니다
                </h3>
                <p className="text-gray-600">
                  아직 등록된 세미나가 없거나 검색 조건에 맞는 세미나가 없습니다
>>>>>>> origin/master
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