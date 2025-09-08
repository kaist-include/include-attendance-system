'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULTS, DATE_CONFIG, ROUTES, VALIDATION_RULES } from '@/config/constants';
import type { ApplicationType, Session } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { 
  Edit, 
  BarChart3, 
  Tag, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  Lightbulb, 
  X,
  ArrowLeft,
  Users,
  CheckSquare,
  UserPlus,
  ClockIcon,
  CheckCircle,
  XCircle
} from 'lucide-react';

const categoryTags = ['기초', '백엔드', '프론트엔드', 'AI'];

interface SeminarData {
  id: string;
  title: string;
  description: string;
  capacity: number;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  semester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  startDate: string;
  endDate: string | null;
  location: string | null;
  tags: string[];
  status: string;
  applicationStart: string;
  applicationEnd: string;
  applicationType: ApplicationType;
  enrollments: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  currentUserEnrollment: {
    status: 'pending' | 'approved' | 'rejected';
    applied_at: string;
  } | null;
  sessions: Session[];
  createdAt: string;
  updatedAt: string;
}

export default function SeminarDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // State for seminar data
  const [seminarData, setSeminarData] = useState<SeminarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    title: string;
    description: string;
    capacity: number;
    location: string;
    startDate: string;
    endDate: string;
    applicationStart: string;
    applicationEnd: string;
    applicationType: ApplicationType;
    tags: string[];
  } | null>(null);

  // Session management states
  const [newSession, setNewSession] = useState<{
    title: string;
    description: string;
    date: string;
    duration_minutes: number;
    location: string;
  }>({ title: '', description: '', date: '', duration_minutes: DEFAULTS.sessionDuration, location: '' });

  const [newTag, setNewTag] = useState('');
  const [addingSession, setAddingSession] = useState(false);

  const canManage = isAdmin || (user?.id === seminarData?.owner.id);

  // Helper function to get auth token
  const getAuthToken = async () => {
            const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Load seminar data
  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const loadSeminarData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // With SSR pattern, authentication is handled automatically by middleware
        const response = await fetch(`/api/seminars/${id}`, {
          headers: {
          'Content-Type': 'application/json',
        }
        });
        
        if (!mounted) return;
        
        if (!response.ok) {
          throw new Error('Failed to load seminar data');
        }

        const data: SeminarData = await response.json();
        
        if (mounted) {
          setSeminarData(data);
          
          // Initialize edit data
          setEditData({
            title: data.title,
            description: data.description,
            capacity: data.capacity,
            location: data.location || '',
            startDate: data.startDate,
            endDate: data.endDate || '',
            applicationStart: data.applicationStart,
            applicationEnd: data.applicationEnd,
            applicationType: data.applicationType,
            tags: [...data.tags]
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          console.error('Error loading seminar:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSeminarData();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Helper function to refresh seminar data
  const refreshSeminarData = async () => {
    try {
      // With SSR pattern, authentication is handled automatically by middleware
      const response = await fetch(`/api/seminars/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh seminar data');
      }

      const data: SeminarData = await response.json();
      setSeminarData(data);
      
      // Update edit data with new dates but keep other edits
      setEditData(prev => prev ? {
        ...prev,
        startDate: data.startDate,
        endDate: data.endDate || ''
      } : null);
    } catch (err) {
      console.error('Error refreshing seminar:', err);
    }
  };

  // Save seminar data
  const handleSave = async () => {
    if (!editData || !seminarData) return;

    try {
      setSaving(true);
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          capacity: editData.capacity,
          location: editData.location || null,
          applicationStart: editData.applicationStart,
          applicationEnd: editData.applicationEnd,
          applicationType: editData.applicationType,
          tags: editData.tags
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update seminar');
      }

      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
        title: editData.title,
        description: editData.description,
        capacity: editData.capacity,
        location: editData.location,
        startDate: prev.startDate, // Keep existing startDate
        endDate: prev.endDate, // Keep existing endDate
        applicationStart: editData.applicationStart,
        applicationEnd: editData.applicationEnd,
        applicationType: editData.applicationType,
        tags: editData.tags
      } : null);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.error('Error saving seminar:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add session
  const handleAddSession = async () => {
    if (!newSession.title || !newSession.date) return;

    try {
      setAddingSession(true);
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      title: newSession.title,
          description: newSession.description || null,
      date: newSession.date,
          duration_minutes: newSession.duration_minutes,
          location: newSession.location || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSessionData: Session = await response.json();
      
      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
        sessions: [...prev.sessions, newSessionData].sort((a, b) => a.session_number - b.session_number)
      } : null);

      // Reset form
      setNewSession({ title: '', description: '', date: '', duration_minutes: DEFAULTS.sessionDuration, location: '' });

      // Refresh seminar data to get updated start/end dates
      await refreshSeminarData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add session');
      console.error('Error adding session:', err);
    } finally {
      setAddingSession(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('이 세션을 삭제하시겠습니까?')) return;

    try {
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId)
      } : null);

      // Refresh seminar data to get updated start/end dates
      await refreshSeminarData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      console.error('Error deleting session:', err);
    }
  };

  // Handle enrollment
  const handleEnroll = () => {
    if (!user) {
      router.push(ROUTES.login + `?redirect=${encodeURIComponent(ROUTES.seminarDetail(id || ''))}`);
      return;
    }
    if (!seminarData || seminarData.enrollments.approved >= seminarData.capacity) return;
    
    // TODO: Implement enrollment API call
    console.log('Enrollment feature to be implemented');
  };

  // Tag management
  const handleAddTag = () => {
    if (!editData) return;
    const tag = newTag.trim();
    if (!tag) return;
    if (editData.tags.length >= VALIDATION_RULES.seminar.maxTags) return;
    if (editData.tags.includes(tag)) return;
    
    setEditData(prev => prev ? { ...prev, tags: [...prev.tags, tag] } : null);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!editData) return;
    setEditData(prev => prev ? { ...prev, tags: prev.tags.filter(t => t !== tag) } : null);
  };

  const capacityRate = useMemo(() => {
    if (!seminarData || seminarData.capacity <= 0) return 0;
    return Math.min((seminarData.enrollments.approved / seminarData.capacity) * 100, 100);
  }, [seminarData]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">세미나 정보를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !seminarData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || '세미나를 찾을 수 없습니다.'}</p>
            <Button onClick={() => router.push(ROUTES.seminars)}>목록으로 돌아가기</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{seminarData.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">
                {seminarData.semester.name}
              </span>
              <div className="flex flex-wrap gap-1">
                {seminarData.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button variant="outline" onClick={() => router.push(ROUTES.seminars)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
            {canManage && (
              <>
                <Button variant="outline" onClick={() => router.push(`/seminars/${id}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  세미나 수정
                </Button>
                <Button variant="outline" onClick={() => router.push(`/seminars/${id}/enrollments`)}>
                  <Users className="w-4 h-4 mr-2" />
                  신청 관리
                </Button>
                <Button variant="outline" onClick={() => router.push(`/seminars/${id}/attendance`)}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  출석 관리
                </Button>
              </>
            )}
            {/* Show attendance button for enrolled members */}
            {user && seminarData.currentUserEnrollment?.status === 'approved' && !canManage && (
              <Button variant="outline" onClick={() => router.push(`/seminars/${id}/attendance`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                내 출석 현황
              </Button>
            )}
            {!user ? (
              <Button onClick={handleEnroll}>
                <UserPlus className="w-4 h-4 mr-2" />
                신청하기
              </Button>
            ) : seminarData.currentUserEnrollment ? (
              // 이미 신청한 사용자 - 모든 신청은 승인 대기
              seminarData.currentUserEnrollment.status === 'pending' ? (
                <Button variant="secondary" disabled>
                  <ClockIcon className="w-4 h-4 mr-2" />
                  승인 대기중
                </Button>
              ) : seminarData.currentUserEnrollment.status === 'approved' ? (
                <Button variant="outline" disabled>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  수강중
                </Button>
              ) : (
                <Button variant="destructive" disabled>
                  <XCircle className="w-4 h-4 mr-2" />
                  신청 거절
                </Button>
              )
            ) : seminarData.enrollments.approved < seminarData.capacity ? (
              // 신청하지 않았고 정원이 남은 경우 - 승인 방식 안내
              <div className="flex flex-col gap-2">
                <Button onClick={handleEnroll}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  신청하기
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  신청 후 세미나 개설자의 승인을 받아야 합니다
                </p>
              </div>
            ) : (
              // 정원 마감
              <Button variant="secondary" disabled>
                <XCircle className="w-4 h-4 mr-2" />
                정원 마감
              </Button>
            )}
          </div>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>개요</CardTitle>
            <CardDescription>세미나 기본 정보</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Description */}
              <div className="lg:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">설명</h3>
                {isEditing && editData ? (
                  <textarea
                    value={editData.description}
                    onChange={e => setEditData(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full min-h-32 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <p className="text-foreground">{seminarData.description}</p>
                )}
              </div>
              {/* Right: Facts */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">정원</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">신청 현황</span>
                    <span className="font-medium">{seminarData.enrollments.approved}/{seminarData.capacity}명</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${seminarData.enrollments.approved >= seminarData.capacity ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${capacityRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">일정</h3>
                  {isEditing && editData ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={editData.startDate}
                        readOnly
                        className="px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground cursor-not-allowed focus:outline-none"
                        title="세션 날짜에 따라 자동으로 계산됩니다"
                      />
                      <input
                        type="date"
                        value={editData.endDate}
                        readOnly
                        className="px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground cursor-not-allowed focus:outline-none"
                        title="세션 날짜에 따라 자동으로 계산됩니다"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {seminarData.startDate 
                        ? new Date(seminarData.startDate).toLocaleDateString('ko-KR') 
                        : '시작일 미정'} ~ {' '}
                      {seminarData.endDate 
                        ? new Date(seminarData.endDate).toLocaleDateString('ko-KR') 
                        : '미정'}
                    </p>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      일정은 세션 날짜에 따라 자동으로 계산됩니다
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">신청기간</h3>
                  {isEditing && editData ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="datetime-local"
                        value={editData.applicationStart.slice(0, 16)}
                        onChange={e => setEditData(prev => prev ? { ...prev, applicationStart: e.target.value } : null)}
                        className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="datetime-local"
                        value={editData.applicationEnd.slice(0, 16)}
                        onChange={e => setEditData(prev => prev ? { ...prev, applicationEnd: e.target.value } : null)}
                        className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {seminarData.applicationStart 
                        ? new Date(seminarData.applicationStart).toLocaleDateString('ko-KR') 
                        : '시작일 미정'} ~ {' '}
                      {seminarData.applicationEnd 
                        ? new Date(seminarData.applicationEnd).toLocaleDateString('ko-KR') 
                        : '종료일 미정'}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">장소</h3>
                  {isEditing && editData ? (
                    <input
                      value={editData.location}
                      onChange={e => setEditData(prev => prev ? { ...prev, location: e.target.value } : null)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{seminarData.location || '미정'}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">담당자</h3>
                  <p className="text-sm text-muted-foreground">{seminarData.owner.name}</p>
                  <p className="text-xs text-muted-foreground">{seminarData.owner.email}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-2">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">카테고리 태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {(isEditing && editData ? editData.tags : seminarData.tags).map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                        {canManage && isEditing && (
                          <button className="ml-2 text-xs opacity-70 hover:opacity-100" onClick={() => handleRemoveTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canManage && isEditing && (
                    <>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        placeholder="#태그 추가"
                        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button variant="outline" onClick={handleAddTag}>추가</Button>
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {categoryTags.map(ct => (
                        <button
                          key={ct}
                          onClick={() => { setNewTag(ct); }}
                          className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs"
                        >#{ct}</button>
                      ))}
                    </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">신청 방식</h3>
                {canManage && isEditing && editData ? (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={editData.applicationType === 'first_come'}
                        onChange={() => setEditData(prev => prev ? { ...prev, applicationType: 'first_come' } : null)}
                      />
                      선착순
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={editData.applicationType === 'selection'}
                        onChange={() => setEditData(prev => prev ? { ...prev, applicationType: 'selection' } : null)}
                      />
                      선발제
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {seminarData.applicationType === 'first_come' ? '선착순' : '선발제'}
                  </p>
                )}
              </div>
            </div>

            {canManage && (
              <div className="pt-2">
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>정보 수정</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false);
                      // Reset edit data
                      setEditData({
                        title: seminarData.title,
                        description: seminarData.description,
                        capacity: seminarData.capacity,
                        location: seminarData.location || '',
                        startDate: seminarData.startDate,
                        endDate: seminarData.endDate || '',
                        applicationStart: seminarData.applicationStart,
                        applicationEnd: seminarData.applicationEnd,
                        applicationType: seminarData.applicationType,
                        tags: [...seminarData.tags]
                      });
                    }}>취소</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>회차별 관리</CardTitle>
            <CardDescription>
              각 회차의 날짜, 주제, 학습 내용 기록
              <br />
              <span className="text-xs text-muted-foreground">
                                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  세미나 시작/종료 날짜는 세션 날짜에 따라 자동으로 계산됩니다
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {seminarData.sessions.map((s) => (
                <div key={s.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{s.session_number}회차</span>
                        <h3 className="font-medium text-foreground">{s.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {s.duration_minutes}분
                        </span>
                        {s.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {s.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">수정</Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDeleteSession(s.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {seminarData.sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>등록된 회차가 없습니다</p>
                </div>
              )}

              {canManage && (
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">새 회차 추가</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input
                      placeholder="주제"
                      value={newSession.title}
                      onChange={e => setNewSession(v => ({ ...v, title: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="datetime-local"
                      value={newSession.date}
                      onChange={e => setNewSession(v => ({ ...v, date: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      min={VALIDATION_RULES.session.minDurationMinutes}
                      max={VALIDATION_RULES.session.maxDurationMinutes}
                      value={newSession.duration_minutes}
                      onChange={e => setNewSession(v => ({ ...v, duration_minutes: Number(e.target.value) }))}
                      className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      placeholder="장소 (선택)"
                      value={newSession.location}
                      onChange={e => setNewSession(v => ({ ...v, location: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      placeholder="학습 내용 (선택)"
                      value={newSession.description}
                      onChange={e => setNewSession(v => ({ ...v, description: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring md:col-span-2 lg:col-span-2"
                    />
                  </div>
                  <div className="mt-3">
                    <Button 
                      onClick={handleAddSession} 
                      disabled={addingSession || !newSession.title || !newSession.date}
                    >
                      {addingSession ? '추가 중...' : '회차 추가'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


