"use client";

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ROUTES } from '@/config/constants';
import { Loader2, Calendar, Plus, Check, X, CheckCircle, XCircle } from 'lucide-react';

interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPage() {
  useRequireAuth();
  const { isAdmin } = useAuth();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false
  });

  const allowed = isAdmin;

  // Fetch semesters
  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/semesters');
      if (response.ok) {
        const data = await response.json();
        setSemesters(data);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchSemesters();
    }
  }, [allowed]);

  // Create new semester
  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage('');
    setMessageType(null);

    try {
      const response = await fetch('/api/admin/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`학기 "${result.name}" 생성 완료`);
        setMessageType('success');
        setFormData({ name: '', start_date: '', end_date: '', is_active: false });
        setShowForm(false);
        fetchSemesters();
      } else {
        setMessage(`오류: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('학기 생성 실패');
      setMessageType('error');
    } finally {
      setCreating(false);
    }
  };

  // Set semester as active
  const handleSetActive = async (semesterId: string) => {
    try {
      const response = await fetch(`/api/admin/semesters/${semesterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      });

      if (response.ok) {
        setMessage('현재 학기 설정 완료');
        setMessageType('success');
        fetchSemesters();
      } else {
        const result = await response.json();
        setMessage(`오류: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('학기 설정 실패');
      setMessageType('error');
    }
  };

  // Delete semester
  const handleDelete = async (semesterId: string) => {
    if (!confirm('정말 이 학기를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/semesters/${semesterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('학기 삭제 완료');
        setMessageType('success');
        fetchSemesters();
      } else {
        const result = await response.json();
        setMessage(`오류: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('학기 삭제 실패');
      setMessageType('error');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">관리자</h1>
          <p className="text-muted-foreground mt-2">세미나 및 사용자 관리를 위한 페이지입니다.</p>
        </div>

        {!allowed ? (
          <Card>
            <CardHeader>
              <CardTitle>접근 불가</CardTitle>
              <CardDescription>해당 페이지에 접근할 권한이 없습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={ROUTES.dashboard}>
                <Button variant="outline">대시보드로 돌아가기</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>세미나 관리</CardTitle>
                <CardDescription>세미나 생성 및 수정</CardDescription>
              </CardHeader>
              <CardContent className="space-x-2">
                <Link href={ROUTES.createSeminar}><Button>세미나 개설</Button></Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>사용자 관리</CardTitle>
                <CardDescription>권한 및 프로필 관리 (준비중)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">추후 제공 예정입니다.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>학기 관리</span>
                </CardTitle>
                <CardDescription>현재 학기 설정 및 학기별 세미나 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Semester Button */}
                <Button 
                  onClick={() => setShowForm(!showForm)}
                  className="w-full"
                  variant={showForm ? "secondary" : "default"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showForm ? '취소' : '새 학기 생성'}
                </Button>

                {/* Create Form */}
                {showForm && (
                  <form onSubmit={handleCreateSemester} className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1">학기명</label>
                      <input
                        type="text"
                        placeholder="예: 2025-1"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">시작일</label>
                        <input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">종료일</label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <label htmlFor="is_active" className="text-sm">현재 학기로 설정</label>
                    </div>
                    <Button type="submit" disabled={creating} className="w-full">
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      생성
                    </Button>
                  </form>
                )}

                {/* Message */}
                {message && (
                  <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {messageType === 'success' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{message}</span>
                  </div>
                )}

                {/* Semesters List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">등록된 학기</h4>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">불러오는 중...</span>
                    </div>
                  ) : semesters.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">등록된 학기가 없습니다</p>
                  ) : (
                    semesters.map(semester => (
                      <div key={semester.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{semester.name}</span>
                            {semester.is_active && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                현재 학기
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(semester.start_date).toLocaleDateString()} - {new Date(semester.end_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!semester.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetActive(semester.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(semester.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}


