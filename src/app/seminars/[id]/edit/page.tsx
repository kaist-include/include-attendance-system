'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULTS, ROUTES, VALIDATION_RULES } from '@/config/constants';
import { getAvailableSemesters, formatSemesterLabel } from '@/lib/utils';

export default function EditSeminarPage() {
  // No role requirement - ownership will be checked via API
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [form, setForm] = useState({
    title: '세미나 제목',
    description: '세미나 설명',
    capacity: DEFAULTS.seminarCapacity as number,
    semester: '2025-1',
    start_date: '2025-01-15',
    end_date: '2025-03-15',
    application_start: '2024-12-20',
    application_end: '2025-01-20',
    location: 'KAIST',
    application_type: 'selection' as 'first_come' | 'selection',
    tags: ['기초'] as string[],
    tagInput: '',
  });

  // canEdit will be determined by API ownership check

  const addTag = () => {
    const t = form.tagInput.trim();
    if (!t) return;
    if (form.tags.includes(t)) return;
    if (form.tags.length >= VALIDATION_RULES.seminar.maxTags) return;
    setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: '' }));
  };

  const removeTag = (t: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API will handle permission checking
    // Here we would call API to update the seminar
    alert('세미나가 수정되었습니다 (Mock)');
    router.push(ROUTES.seminarDetail(id || ''));
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">세미나 수정</h1>
          <p className="text-muted-foreground mt-2">세미나 정보를 변경합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>세미나 정보</CardTitle>
            <CardDescription>필수 정보를 수정하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">제목</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={VALIDATION_RULES.seminar.titleMaxLength}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">정원</label>
                  <input
                    type="number"
                    min={VALIDATION_RULES.seminar.minCapacity}
                    max={VALIDATION_RULES.seminar.maxCapacity}
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium text-foreground">설명</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    maxLength={VALIDATION_RULES.seminar.descriptionMaxLength}
                    className="mt-1 w-full min-h-32 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">학기</label>
                  <select
                    value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {getAvailableSemesters().map((semesterOption) => (
                      <option key={semesterOption.value} value={semesterOption.value}>
                        {semesterOption.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">시작일</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">종료일 (선택)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">신청 시작일</label>
                  <input
                    type="date"
                    value={form.application_start}
                    onChange={e => setForm(f => ({ ...f, application_start: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">신청 종료일</label>
                  <input
                    type="date"
                    value={form.application_end}
                    onChange={e => setForm(f => ({ ...f, application_end: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">장소</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">신청 방식</label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      📝 모든 세미나는 <strong>Owner 승인 방식</strong>입니다<br/>
                      신청자는 신청 후 세미나 개설자의 승인을 받아야 합니다
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="text-sm font-medium text-foreground">카테고리 태그</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <span className="mr-1">🏷️</span>{tag}
                        <button type="button" className="ml-2 text-xs opacity-70 hover:opacity-100" onClick={() => removeTag(tag)}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={form.tagInput}
                      onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                      placeholder="#태그 추가"
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>추가</Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="submit">저장</Button>
                <Button type="button" variant="outline" onClick={() => router.push(ROUTES.seminarDetail(id || ''))}>취소</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


