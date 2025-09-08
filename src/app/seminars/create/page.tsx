'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { DEFAULTS, ROUTES, VALIDATION_RULES } from '@/config/constants';
import { Tag, X, FileText } from 'lucide-react';

interface SemesterOption {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export default function CreateSeminarPage() {
  const { user } = useRequireAuth();
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    capacity: DEFAULTS.seminarCapacity as number,
    semester_id: '',
    start_date: '',
    end_date: '',
    application_start: '',
    application_end: '',
    location: '',
    application_type: 'selection' as 'first_come' | 'selection',
    tags: [] as string[],
    tagInput: '',
  });

  // Fetch available semesters from database
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const response = await fetch('/api/admin/semesters/available');
        if (response.ok) {
          const data = await response.json();
          setSemesters(data);
          // Set active semester as default
          const activeSemester = data.find((s: SemesterOption) => s.isActive);
          if (activeSemester && !form.semester_id) {
            setForm(f => ({ ...f, semester_id: activeSemester.id }));
          }
        }
      } catch (error) {
        console.error('Error fetching semesters:', error);
      } finally {
        setLoadingSemesters(false);
      }
    };

    fetchSemesters();
  }, [form.semester_id]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.start_date || !form.application_start || !form.semester_id) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/seminars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          capacity: form.capacity,
          semester_id: form.semester_id,
          start_date: form.start_date,
          end_date: form.end_date || null,
          location: form.location || null,
          application_type: form.application_type,
          application_start: new Date(form.application_start + 'T00:00:00.000Z').toISOString(),
          application_end: form.application_end ? 
            new Date(form.application_end + 'T23:59:59.999Z').toISOString() :
            new Date(form.application_start + 'T23:59:59.999Z').toISOString(),
          tags: form.tags,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('세미나가 생성되었습니다!');
        window.location.href = ROUTES.seminars;
      } else {
        alert(`오류가 발생했습니다: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating seminar:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
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
                    value={form.semester_id}
                    onChange={e => setForm(f => ({ ...f, semester_id: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    disabled={loadingSemesters}
                  >
                    <option value="">
                      {loadingSemesters ? '학기 목록을 불러오는 중...' : '학기를 선택하세요'}
                    </option>
                    {semesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.label} {semester.isActive && '(현재 학기)'}
                      </option>
                    ))}
                  </select>
                  {semesters.length === 0 && !loadingSemesters && (
                    <p className="text-xs text-red-600 mt-1">
                      관리자가 학기를 생성해야 세미나를 개설할 수 있습니다.
                    </p>
                  )}
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
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <FileText className="w-4 h-4 inline mr-1" /> 모든 세미나는 <strong>Owner 승인 방식</strong>입니다<br/>
                      신청자는 신청 후 세미나 개설자의 승인을 받아야 합니다
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="text-sm font-medium text-foreground">카테고리 태그</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                  <Tag className="w-3 h-3 mr-1" />
                          {tag}
                                                  <button type="button" className="ml-2 text-xs opacity-70 hover:opacity-100" onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '생성 중...' : '세미나 생성'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


