'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface Applicant {
  id: string;
  name: string;
  email: string;
  applied_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function SeminarEnrollmentsPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { isAdmin, isSeminarLeader } = useAuth();
  const canManage = isAdmin || isSeminarLeader;

  const [capacity, setCapacity] = useState(20);
  const [applicants, setApplicants] = useState<Applicant[]>([
    { id: 'u1', name: '김학생', email: 'kim@example.com', applied_at: '2025-01-10 10:00', status: 'approved' },
    { id: 'u2', name: '박학생', email: 'park@example.com', applied_at: '2025-01-10 10:05', status: 'pending' },
    { id: 'u3', name: '이학생', email: 'lee@example.com', applied_at: '2025-01-10 10:09', status: 'pending' },
  ]);

  const approvedCount = useMemo(() => applicants.filter(a => a.status === 'approved').length, [applicants]);
  const capacityRate = Math.min((approvedCount / capacity) * 100, 100);

  const approve = (uid: string) => {
    if (!canManage) return;
    setApplicants(prev => prev.map(a => a.id === uid ? { ...a, status: 'approved' } : a));
  };
  const reject = (uid: string) => {
    if (!canManage) return;
    setApplicants(prev => prev.map(a => a.id === uid ? { ...a, status: 'rejected' } : a));
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">신청 관리</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>세미나로 돌아가기</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>정원 및 현황</CardTitle>
            <CardDescription>실시간 신청 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">승인 인원</span>
                  <span className="font-medium">{approvedCount}/{capacity}명</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${approvedCount >= capacity ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${capacityRate}%` }}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">정원</label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">선착순/선발제는 상세 페이지에서 변경 가능합니다.</p>
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
            <div className="space-y-3">
              {applicants.map(a => (
                <div key={a.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{a.name}</div>
                    <div className="text-sm text-muted-foreground">{a.email} · {a.applied_at}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-secondary ${a.status === 'approved' ? 'text-foreground' : a.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>{a.status}</span>
                    {canManage && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => approve(a.id)}>승인</Button>
                        <Button size="sm" variant="secondary" onClick={() => reject(a.id)}>거절</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


