'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { DEFAULTS, ROUTES, VALIDATION_RULES } from '@/config/constants';

export default function CreateSeminarPage() {
  const { user } = useRequireAuth();
  const { isAdmin, isSeminarLeader } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    capacity: DEFAULTS.seminarCapacity as number,
    semester: '2025-1',
    start_date: '',
    end_date: '',
    application_start: '',
    application_end: '',
    location: '',
    application_type: 'first_come' as 'first_come' | 'selection',
    tags: [] as string[],
    tagInput: '',
  });

  // Role protection is handled by useRequireRole; no need to locally disable the button

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
    if (!form.title || !form.description || !form.start_date || !form.application_start) return;
    if (!(isAdmin || isSeminarLeader)) {
      alert('세미나를 개설할 권한이 없습니다. 관리자 또는 세미나 리더에게 문의하세요.');
      return;
    }
    // Here we would call API to create the seminar
    alert('세미나가 생성되었습니다 (Mock)');
    window.location.href = ROUTES.seminars;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">세미나 개설</h1>
          <p className="text-muted-foreground mt-2">제목, 설명, 정원, 일정, 태그 등을 설정하세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>세미나 정보</CardTitle>
            <CardDescription>필수 정보를 입력하세요</CardDescription>
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
                    placeholder="세미나 제목"
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
                    placeholder="세미나에 대한 설명을 입력하세요"
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
                    <option value="2024-1">2024년 봄학기</option>
                    <option value="2024-2">2024년 가을학기</option>
                    <option value="2025-1">2025년 봄학기</option>
                    <option value="2025-summer">2025년 여름학기</option>
                    <option value="2025-fall">2025년 가을학기</option>
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
                    placeholder="온라인, 오프라인 등"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">신청 방식</label>
                  <div className="mt-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={form.application_type === 'first_come'}
                        onChange={() => setForm(f => ({ ...f, application_type: 'first_come' }))}
                      />
                      선착순
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={form.application_type === 'selection'}
                        onChange={() => setForm(f => ({ ...f, application_type: 'selection' }))}
                      />
                      선발제
                    </label>
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
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {['기초', '백엔드', '프론트엔드', 'AI'].map(ct => (
                      <button key={ct} type="button" onClick={() => setForm(f => ({ ...f, tagInput: ct }))} className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs">#{ct}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit">세미나 생성</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


