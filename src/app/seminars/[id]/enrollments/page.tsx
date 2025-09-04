'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';

interface Applicant {
  id: string;
  userId: string;
  name: string;
  email: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface EnrollmentData {
  capacity: number;
  stats: {
    capacity: number;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  enrollments: Applicant[];
}

export default function SeminarEnrollmentsPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  // canManage will be determined by API ownership check

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadEnrollments = useCallback(async () => {
    if (!id || !user?.id || authLoading) return;

    let mounted = true;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading enrollments for seminar:', id);

      // With SSR pattern, authentication is handled automatically by middleware
      const response = await fetch(`/api/seminars/${id}/enrollments`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!mounted) return;

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('권한이 없습니다. 세미나 담당자만 신청자를 관리할 수 있습니다.');
        }
        throw new Error('Failed to load enrollment data');
      }

      const data: EnrollmentData = await response.json();
      
      if (mounted) {
        setEnrollmentData(data);
        console.log('✅ Loaded enrollments:', data.enrollments.length, 'applications');
      }

    } catch (err) {
      console.error('❌ Error loading enrollments:', err);
      if (mounted) {
        setError(err instanceof Error ? err.message : '신청자 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  }, [id, user?.id, authLoading]);

  const updateStatus = async (enrollmentId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    if (!id || !user?.id || authLoading) return;

    let mounted = true;

    try {
      setUpdating(enrollmentId);

      console.log('🔄 Updating enrollment status:', enrollmentId, 'to', newStatus);

      // With SSR pattern, authentication is handled automatically by middleware
      const response = await fetch(`/api/seminars/${id}/enrollments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: newStatus === 'approved' ? 'approve' : 'reject',
          enrollmentId
        }),
      });

      if (!mounted) return;

      if (!response.ok) {
        throw new Error('상태 변경에 실패했습니다.');
      }

      console.log('✅ Status updated successfully');
      
      // Reload data to reflect changes
      if (mounted) {
        await loadEnrollments();
      }

    } catch (err) {
      console.error('❌ Error updating status:', err);
      if (mounted) {
        alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
      }
    } finally {
      if (mounted) {
        setUpdating(null);
      }
    }

    return () => {
      mounted = false;
    };
  };

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadEnrollments();
    }
  }, [loadEnrollments, authLoading, user?.id]);

  const approve = (enrollmentId: string) => updateStatus(enrollmentId, 'approved');
  const reject = (enrollmentId: string) => updateStatus(enrollmentId, 'rejected');

  const applicants = enrollmentData?.enrollments || [];
  const stats = enrollmentData?.stats || { capacity: 0, total: 0, approved: 0, pending: 0, rejected: 0 };
  const capacity = enrollmentData?.capacity || 0;
  const approvedCount = stats.approved;
  const capacityRate = Math.min((approvedCount / Math.max(capacity, 1)) * 100, 100);

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">신청자 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => router.back()}>뒤로 가기</Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">신청 관리</h1>
            <p className="text-muted-foreground mt-1">세미나 신청자를 관리하고 승인/거절을 처리하세요</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            뒤로 가기
          </Button>
        </div>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>신청 현황</CardTitle>
            <CardDescription>정원 대비 신청 및 승인 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground">총 신청자</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-sm text-green-600">승인</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-600">대기</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-red-600">거절</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">정원 대비 승인 현황</span>
                <span className="font-medium">{approvedCount}/{capacity}명 ({capacityRate.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    capacityRate >= 100 ? 'bg-red-500' : capacityRate >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${capacityRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신청자 목록</CardTitle>
            <CardDescription>대기/승인/거절 처리</CardDescription>
          </CardHeader>
          <CardContent>
            {applicants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">아직 신청자가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applicants.map(a => (
                  <div key={a.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{a.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {a.email} · {new Date(a.appliedAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : a.status === 'rejected' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'approved' ? '승인' : a.status === 'rejected' ? '거절' : '대기'}
                      </span>
                      
                      {/* Show owner badge instead of action buttons for self-enrollment */}
                      {a.userId === user?.id ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          개설자
                        </span>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => approve(a.id)}
                            disabled={updating === a.id || a.status === 'approved'}
                          >
                            {updating === a.id ? '처리중...' : '승인'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => reject(a.id)}
                            disabled={updating === a.id || a.status === 'rejected'}
                          >
                            {updating === a.id ? '처리중...' : '거절'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


