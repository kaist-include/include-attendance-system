'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
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
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    application_start: undefined as Date | undefined,
    application_end: undefined as Date | undefined,
    location: '',

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
          start_date: form.start_date.toISOString().split('T')[0],
          end_date: form.end_date ? form.end_date.toISOString().split('T')[0] : null,
          location: form.location || null,
    
          application_start: form.application_start.toISOString(),
          application_end: form.application_end ? 
            form.application_end.toISOString() :
            form.application_start.toISOString(),
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
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={VALIDATION_RULES.seminar.titleMaxLength}
                    placeholder="세미나 제목"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">정원</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={VALIDATION_RULES.seminar.minCapacity}
                    max={VALIDATION_RULES.seminar.maxCapacity}
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="lg:col-span-2 space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    maxLength={VALIDATION_RULES.seminar.descriptionMaxLength}
                    className="min-h-32 resize-none"
                    placeholder="세미나에 대한 설명을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">학기</Label>
                  <Select
                    value={form.semester_id}
                    onValueChange={(value) => setForm(f => ({ ...f, semester_id: value }))}
                    disabled={loadingSemesters}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={loadingSemesters ? '학기 목록을 불러오는 중...' : '학기를 선택하세요'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id}>
                          {semester.label} {semester.isActive && '(현재 학기)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {semesters.length === 0 && !loadingSemesters && (
                    <p className="text-xs text-red-600 mt-1">
                      관리자가 학기를 생성해야 세미나를 개설할 수 있습니다.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">시작일</Label>
                  <DatePicker
                    date={form.start_date}
                    onSelect={(date) => setForm(f => ({ ...f, start_date: date }))}
                    placeholder="세미나 시작일을 선택하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">종료일 (선택)</Label>
                  <DatePicker
                    date={form.end_date}
                    onSelect={(date) => setForm(f => ({ ...f, end_date: date }))}
                    placeholder="세미나 종료일을 선택하세요"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="application_start">신청 시작일</Label>
                  <DatePicker
                    date={form.application_start}
                    onSelect={(date) => setForm(f => ({ ...f, application_start: date }))}
                    placeholder="신청 시작일을 선택하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application_end">신청 종료일</Label>
                  <DatePicker
                    date={form.application_end}
                    onSelect={(date) => setForm(f => ({ ...f, application_end: date }))}
                    placeholder="신청 종료일을 선택하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">장소</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="온라인, 오프라인 등"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>신청 방식</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <FileText className="w-4 h-4 inline mr-1" /> 모든 세미나는 <strong>Owner 승인 방식</strong>입니다<br/>
                      신청자는 신청 후 세미나 개설자의 승인을 받아야 합니다
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-2">
                  <Label htmlFor="tags">카테고리 태그</Label>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-1 h-4 w-4 text-muted-foreground hover:text-foreground"
                          onClick={() => removeTag(tag)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={form.tagInput}
                      onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                      placeholder="#태그 추가"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>추가</Button>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {['기초', '백엔드', '프론트엔드', 'AI'].map(ct => (
                      <Button 
                        key={ct} 
                        type="button" 
                        variant="secondary" 
                        size="sm"
                        onClick={() => setForm(f => ({ ...f, tagInput: ct }))}
                      >
                        #{ct}
                      </Button>
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


