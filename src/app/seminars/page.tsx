'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Calendar, Users, Clock, MapPin, Tag, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/constants';

// 임시 데이터 (실제로는 API에서 가져올 데이터)
const seminars = [
  {
    id: 1,
    title: 'React 심화 세미나',
    description: 'React의 고급 패턴과 성능 최적화 기법을 학습합니다. Hooks, Context API, 메모이제이션 등을 다룹니다.',
    instructor: '김개발',
    startDate: '2025-01-15',
    endDate: '2025-03-15',
    capacity: 20,
    enrolled: 18,
    location: '온라인 (Zoom)',
    tags: ['React', 'Frontend', '심화'],
    status: 'recruiting' as const,
    sessions: 8,
  },
  {
    id: 2,
    title: 'AI/ML 기초 스터디',
    description: '머신러닝과 딥러닝의 기초 개념부터 실습까지 체계적으로 학습합니다.',
    instructor: '박머신',
    startDate: '2025-02-01',
    endDate: '2025-04-30',
    capacity: 15,
    enrolled: 12,
    location: 'N1 세미나실',
    tags: ['AI', 'Machine Learning', '기초'],
    status: 'recruiting' as const,
    sessions: 12,
  },
  {
    id: 3,
    title: '백엔드 아키텍처 세미나',
    description: '확장 가능한 백엔드 시스템 설계와 마이크로서비스 아키텍처를 학습합니다.',
    instructor: '최백엔드',
    startDate: '2025-01-20',
    endDate: '2025-03-20',
    capacity: 25,
    enrolled: 25,
    location: 'N2 세미나실',
    tags: ['Backend', 'Architecture', '심화'],
    status: 'in_progress' as const,
    sessions: 10,
  },
  {
    id: 4,
    title: 'UI/UX 디자인 기초',
    description: '사용자 경험 설계와 인터페이스 디자인 원칙을 배우고 실습합니다.',
    instructor: '정디자인',
    startDate: '2025-03-01',
    endDate: '2025-05-01',
    capacity: 20,
    enrolled: 5,
    location: '온라인 (Discord)',
    tags: ['Design', 'UI', 'UX', '기초'],
    status: 'recruiting' as const,
    sessions: 8,
  },
];

const statusLabels = {
  recruiting: { label: '모집중', color: 'bg-green-100 text-green-800' },
  in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-800' },
};

export default function SeminarsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 모든 태그 수집
  const allTags = Array.from(new Set(seminars.flatMap(seminar => seminar.tags)));

  // 필터링된 세미나
  const filteredSeminars = seminars.filter(seminar => {
    const matchesSearch = seminar.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seminar.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seminar.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => seminar.tags.includes(tag));
    
    const matchesStatus = statusFilter === 'all' || seminar.status === statusFilter;

    return matchesSearch && matchesTags && matchesStatus;
  });

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
            <h1 className="text-3xl font-bold text-gray-900">세미나</h1>
            <p className="text-gray-600 mt-2">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="세미나 제목, 설명, 강사명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">모든 상태</option>
                    <option value="recruiting">모집중</option>
                    <option value="in_progress">진행중</option>
                    <option value="completed">완료</option>
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
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
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
                    <span>{seminar.startDate} ~ {seminar.endDate}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{seminar.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>총 {seminar.sessions}회차</span>
                  </div>
                </div>

                {/* 정원 정보 */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">신청 현황</span>
                    <span className="font-medium">
                      {seminar.enrolled}/{seminar.capacity}명
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        seminar.enrolled >= seminar.capacity 
                          ? 'bg-red-500' 
                          : 'bg-blue-500'
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
          ))}
        </div>

        {/* 검색 결과 없음 */}
        {filteredSeminars.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-600">
                  다른 검색어나 필터를 시도해보세요
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