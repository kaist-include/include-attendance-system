'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULTS, DATE_CONFIG, ROUTES, VALIDATION_RULES } from '@/config/constants';
import type { ApplicationType, Session } from '@/types';

const semesterOptions = ['2025-1', '2024-2', '2024-1', '2023-2'];
const categoryTags = ['기초', '백엔드', '프론트엔드', 'AI'];

export default function SeminarDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { user, isAdmin, isSeminarLeader } = useAuth();

  // Mocked seminar data (replace with API integration)
  const [title, setTitle] = useState('React 심화 세미나');
  const [description, setDescription] = useState(
    'React의 고급 패턴과 성능 최적화 기법을 학습합니다. Hooks, Context API, 메모이제이션 등을 다룹니다.'
  );
  const [semester, setSemester] = useState<string>('2025-1');
  const [capacity, setCapacity] = useState<number>(24);
  const [enrolled, setEnrolled] = useState<number>(18);
  const [location, setLocation] = useState<string>('온라인 (Zoom)');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '2025-01-15', end: '2025-03-15' });
  const [applicationRange, setApplicationRange] = useState<{ start: string; end: string }>({ start: '2024-12-20', end: '2025-01-20' });
  const [applicationType, setApplicationType] = useState<ApplicationType>('first_come');
  const [tags, setTags] = useState<string[]>(['React', 'Frontend', '심화']);

  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const canManage = isAdmin || isSeminarLeader;

  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 's1',
      seminar_id: id || '1',
      session_number: 1,
      title: '고급 Hooks 활용',
      description: 'useMemo, useCallback, useRef 심화',
      date: '2025-01-20',
      duration_minutes: 120,
      location: '온라인',
      materials_url: '',
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 's2',
      seminar_id: id || '1',
      session_number: 2,
      title: '상태관리 전략',
      description: 'Context, Reducer 패턴, 외부 상태관리 비교',
      date: '2025-01-27',
      duration_minutes: 120,
      location: '온라인',
      materials_url: '',
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [newSession, setNewSession] = useState<{
    title: string;
    description: string;
    date: string;
    duration: number;
    location: string;
  }>({ title: '', description: '', date: '', duration: DEFAULTS.sessionDuration, location: '' });

  const capacityRate = useMemo(() => {
    if (capacity <= 0) return 0;
    return Math.min((enrolled / capacity) * 100, 100);
  }, [capacity, enrolled]);

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    if (tags.length >= VALIDATION_RULES.seminar.maxTags) return;
    if (tags.includes(tag)) return;
    setTags(prev => [...prev, tag]);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleAddSession = () => {
    if (!newSession.title || !newSession.date) return;
    const nextNumber = sessions.length + 1;
    const session: Session = {
      id: `tmp-${Date.now()}`,
      seminar_id: id || '1',
      session_number: nextNumber,
      title: newSession.title,
      description: newSession.description,
      date: newSession.date,
      duration_minutes: newSession.duration,
      location: newSession.location,
      materials_url: '',
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSessions(prev => [...prev, session]);
    setNewSession({ title: '', description: '', date: '', duration: DEFAULTS.sessionDuration, location: '' });
  };

  const handleEnroll = () => {
    if (!user) {
      router.push(ROUTES.login + `?redirect=${encodeURIComponent(ROUTES.seminarDetail(id || ''))}`);
      return;
    }
    if (enrolled >= capacity) return;
    setEnrolled(prev => Math.min(prev + 1, capacity));
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">{semester}</span>
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button variant="outline" onClick={() => router.push(ROUTES.seminars)}>목록으로</Button>
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}/enrollments`)}>신청 관리</Button>
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}/attendance`)}>출석 관리</Button>
            {enrolled < capacity ? (
              <Button onClick={handleEnroll}>신청하기</Button>
            ) : (
              <Button variant="secondary" disabled>정원 마감</Button>
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
                {isEditing ? (
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full min-h-32 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <p className="text-foreground">{description}</p>
                )}
              </div>
              {/* Right: Facts */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">정원</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">신청 현황</span>
                    <span className="font-medium">{enrolled}/{capacity}명</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${enrolled >= capacity ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${capacityRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">일정</h3>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
                        className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
                        className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{dateRange.start} ~ {dateRange.end}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">신청기간</h3>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={applicationRange.start}
                        onChange={e => setApplicationRange(r => ({ ...r, start: e.target.value }))}
                        className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="date"
                        value={applicationRange.end}
                        onChange={e => setApplicationRange(r => ({ ...r, end: e.target.value }))}
                        className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{applicationRange.start} ~ {applicationRange.end}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">장소</h3>
                  {isEditing ? (
                    <input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{location}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-2">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">학기</h3>
                  {canManage && isEditing ? (
                    <select
                      value={semester}
                      onChange={e => setSemester(e.target.value)}
                      className="px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                    >
                      {semesterOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{semester}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">카테고리 태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <span className="mr-1">🏷️</span>{tag}
                        {canManage && isEditing && (
                          <button className="ml-2 text-xs opacity-70 hover:opacity-100" onClick={() => handleRemoveTag(tag)}>✕</button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canManage && isEditing && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        placeholder="#태그 추가"
                        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button variant="outline" onClick={handleAddTag}>추가</Button>
                    </div>
                  )}
                  {canManage && isEditing && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {categoryTags.map(ct => (
                        <button
                          key={ct}
                          onClick={() => { setNewTag(ct); }}
                          className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs"
                        >#{ct}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">신청 방식</h3>
                {canManage && isEditing ? (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={applicationType === 'first_come'}
                        onChange={() => setApplicationType('first_come')}
                      />
                      선착순
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={applicationType === 'selection'}
                        onChange={() => setApplicationType('selection')}
                      />
                      선발제
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{applicationType === 'first_come' ? '선착순' : '선발제'}</p>
                )}
              </div>
            </div>

            {canManage && (
              <div className="pt-2">
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>정보 수정</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button>저장</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>취소</Button>
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
            <CardDescription>각 회차의 날짜, 주제, 학습 내용 기록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((s) => (
                <div key={s.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{s.session_number}회차</span>
                        <h3 className="font-medium text-foreground">{s.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span>📅 {s.date}</span>
                        <span>⏱️ {s.duration_minutes}분</span>
                        {s.location && <span>📍 {s.location}</span>}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">수정</Button>
                        <Button variant="secondary" size="sm">삭제</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <span className="block text-6xl mb-4 opacity-30">📚</span>
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
                      type="date"
                      value={newSession.date}
                      onChange={e => setNewSession(v => ({ ...v, date: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      min={VALIDATION_RULES.session.minDurationMinutes}
                      max={VALIDATION_RULES.session.maxDurationMinutes}
                      value={newSession.duration}
                      onChange={e => setNewSession(v => ({ ...v, duration: Number(e.target.value) }))}
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
                    <Button onClick={handleAddSession}>회차 추가</Button>
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


