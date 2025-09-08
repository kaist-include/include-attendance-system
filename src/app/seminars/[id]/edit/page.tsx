'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULTS, ROUTES, VALIDATION_RULES } from '@/config/constants';
import { formatSemesterLabel } from '@/lib/utils';
import { X, Tag, FileText } from 'lucide-react';

interface SemesterOption {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export default function EditSeminarPage() {
  // No role requirement - ownership will be checked via API
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [loadingSeminar, setLoadingSeminar] = useState(true);
  const [seminar, setSeminar] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        }
      } catch (error) {
        console.error('Error fetching semesters:', error);
      } finally {
        setLoadingSemesters(false);
      }
    };

    fetchSemesters();
  }, []);

  // Fetch current seminar data
  useEffect(() => {
    const fetchSeminar = async () => {
      if (!id) return;
      
      try {
        setLoadingSeminar(true);
        const response = await fetch(`/api/seminars/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('세미나를 찾을 수 없습니다.');
          } else {
            setError('세미나 정보를 불러오는데 실패했습니다.');
          }
          return;
        }

        const data = await response.json();
        setSeminar(data);
        
        // Pre-populate form with current data
        setForm({
          title: data.title || '',
          description: data.description || '',
          capacity: data.capacity || DEFAULTS.seminarCapacity,
          semester_id: data.semester_id || '',
          start_date: data.startDate ? data.startDate.split('T')[0] : '',
          end_date: data.endDate ? data.endDate.split('T')[0] : '',
          application_start: data.applicationStart ? data.applicationStart.split('T')[0] : '',
          application_end: data.applicationEnd ? data.applicationEnd.split('T')[0] : '',
          location: data.location || '',
          application_type: data.applicationType || 'selection',
          tags: data.tags || [],
          tagInput: '',
        });
        
      } catch (error) {
        console.error('Error fetching seminar:', error);
        setError('세미나 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoadingSeminar(false);
      }
    };

    fetchSeminar();
  }, [id]);

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

  const validateForm = () => {
    if (!form.title.trim()) {
      return '제목을 입력해주세요.';
    }
    if (form.title.length > VALIDATION_RULES.seminar.titleMaxLength) {
      return `제목은 ${VALIDATION_RULES.seminar.titleMaxLength}자 이하로 입력해주세요.`;
    }
    if (!form.description.trim()) {
      return '설명을 입력해주세요.';
    }
    if (form.description.length > VALIDATION_RULES.seminar.descriptionMaxLength) {
      return `설명은 ${VALIDATION_RULES.seminar.descriptionMaxLength}자 이하로 입력해주세요.`;
    }
    if (!form.semester_id) {
      return '학기를 선택해주세요.';
    }
    if (!form.start_date) {
      return '시작일을 입력해주세요.';
    }
    if (!form.application_start) {
      return '신청 시작일을 입력해주세요.';
    }
    if (form.capacity < VALIDATION_RULES.seminar.minCapacity || form.capacity > VALIDATION_RULES.seminar.maxCapacity) {
      return `정원은 ${VALIDATION_RULES.seminar.minCapacity}명 이상 ${VALIDATION_RULES.seminar.maxCapacity}명 이하로 설정해주세요.`;
    }
    if (form.tags.length > VALIDATION_RULES.seminar.maxTags) {
      return `태그는 ${VALIDATION_RULES.seminar.maxTags}개 이하로 설정해주세요.`;
    }
    if (form.end_date && form.end_date < form.start_date) {
      return '종료일은 시작일보다 늦어야 합니다.';
    }
    if (form.application_end && form.application_end < form.application_start) {
      return '신청 종료일은 신청 시작일보다 늦어야 합니다.';
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!id) {
      setError('세미나 ID를 찾을 수 없습니다.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`/api/seminars/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          capacity: form.capacity,
          semester_id: form.semester_id,
          startDate: form.start_date,
          endDate: form.end_date || null,
          location: form.location || null,
          applicationType: form.application_type,
          applicationStart: new Date(form.application_start + 'T00:00:00.000Z').toISOString(),
          applicationEnd: form.application_end ? 
            new Date(form.application_end + 'T23:59:59.999Z').toISOString() :
            new Date(form.application_start + 'T23:59:59.999Z').toISOString(),
          tags: form.tags,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('세미나가 성공적으로 수정되었습니다!');
        setTimeout(() => {
          router.push(ROUTES.seminarDetail(id));
        }, 1500);
      } else {
        if (response.status === 403) {
          setError('세미나를 수정할 권한이 없습니다.');
        } else if (response.status === 404) {
          setError('세미나를 찾을 수 없습니다.');
        } else {
          setError(result.error || '세미나 수정 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('Error updating seminar:', error);
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSeminar) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>세미나 정보를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error && !seminar) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push(ROUTES.seminars)}>
              세미나 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">세미나 수정</h1>
          <p className="text-muted-foreground mt-2">세미나 정보를 변경합니다.</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-green-800">{success}</p>
          </div>
        )}

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
                      관리자가 학기를 생성해야 세미나를 수정할 수 있습니다.
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
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || loadingSemesters || !seminar}
                >
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(ROUTES.seminarDetail(id || ''))}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


