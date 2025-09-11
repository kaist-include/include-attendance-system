'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULTS, ROUTES, VALIDATION_RULES } from '@/config/constants';
import { formatSemesterLabel } from '@/lib/utils';
import { X, Tag, FileText, Users, Plus, Trash2, Search, UserPlus } from 'lucide-react';

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
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    application_start: undefined as Date | undefined,
    application_end: undefined as Date | undefined,
    location: '',
    external_url: '',

    tags: [] as string[],
    tagInput: '',
  });

  // Role management state
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

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
          start_date: data.startDate ? new Date(data.startDate) : undefined,
          end_date: data.endDate ? new Date(data.endDate) : undefined,
          application_start: data.applicationStart ? new Date(data.applicationStart) : undefined,
          application_end: data.applicationEnd ? new Date(data.applicationEnd) : undefined,
          location: data.location || '',
          external_url: data.external_url || '',
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

  // Role management functions
  const fetchPermissions = async () => {
    if (!id) return;
    setLoadingPermissions(true);
    try {
      const response = await fetch(`/api/seminars/${id}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&seminarId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addPermission = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/seminars/${id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      
      if (response.ok) {
        await fetchPermissions(); // Refresh the list
        setUserSearch('');
        setSearchResults([]);
        setShowUserSearch(false);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to add permission');
      }
    } catch (error) {
      console.error('Error adding permission:', error);
      setError('Failed to add permission');
    }
  };

  const removePermission = async (permissionId: string) => {
    try {
      const response = await fetch(`/api/seminars/${id}/permissions?permissionId=${permissionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchPermissions(); // Refresh the list
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to remove permission');
      }
    } catch (error) {
      console.error('Error removing permission:', error);
      setError('Failed to remove permission');
    }
  };

  // Load permissions when component mounts
  useEffect(() => {
    if (id && seminar) {
      fetchPermissions();
    }
  }, [id, seminar]);

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
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      return '종료일은 시작일보다 늦어야 합니다.';
    }
    if (form.application_end && form.application_start && form.application_end < form.application_start) {
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
          startDate: form.start_date ? form.start_date.toISOString().split('T')[0] : null,
          endDate: form.end_date ? form.end_date.toISOString().split('T')[0] : null,
          location: form.location || null,
          external_url: form.external_url || null,
          applicationStart: form.application_start ? form.application_start.toISOString() : null,
          applicationEnd: form.application_end ? 
            form.application_end.toISOString() :
            (form.application_start ? form.application_start.toISOString() : null),
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
            <LoadingSpinner />
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
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>세미나 정보</CardTitle>
            <CardDescription>필수 정보를 수정하세요</CardDescription>
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
                      관리자가 학기를 생성해야 세미나를 수정할 수 있습니다.
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_url">참고 링크 (선택사항)</Label>
                <Input
                  id="external_url"
                  type="url"
                  value={form.external_url}
                  onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label>신청 방식</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
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

        {/* Role Management Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>세미나 권한 관리</CardTitle>
            </div>
            <CardDescription>
              다른 사용자에게 세미나 관리 권한을 부여할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add User Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">사용자 추가</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserSearch(!showUserSearch)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  사용자 추가
                </Button>
              </div>

              {showUserSearch && (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="이름 또는 이메일로 검색..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>

                  {searchLoading && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      검색 중...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 border rounded-lg bg-background">
                          <div>
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addPermission(user.id, 'assistant')}
                            >
                              조교 추가
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addPermission(user.id, 'moderator')}
                            >
                              관리자 추가
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {userSearch.length >= 2 && !searchLoading && searchResults.length === 0 && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current Permissions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">현재 권한</h3>
              
              {loadingPermissions ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  권한 정보를 불러오는 중...
                </div>
              ) : permissions.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/20">
                  아직 추가된 권한이 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {permission.users?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{permission.users?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{permission.users?.email || 'No email'}</div>
                        </div>
                        <Badge variant={permission.role === 'moderator' ? 'default' : 'secondary'}>
                          {permission.role === 'moderator' ? '관리자' : '조교'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePermission(permission.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role Descriptions */}
            <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
              <h4 className="text-sm font-medium">권한 설명</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div><strong>조교:</strong> 출석 관리, 세션 정보 확인</div>
                <div><strong>관리자:</strong> 조교 권한 + 세미나 수정, 신청자 승인/거부</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


