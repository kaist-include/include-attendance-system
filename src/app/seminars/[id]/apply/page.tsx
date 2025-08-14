'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/constants';

export default function SeminarApplyPage() {
  const { user } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSubmitting(true);
      // TODO: API 연동
      alert('신청이 접수되었습니다 (Mock)');
      router.push(ROUTES.seminarDetail(id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">세미나 신청</h1>
          <p className="text-muted-foreground mt-2">간단한 확인 후 신청을 완료하세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>신청 정보</CardTitle>
            <CardDescription>제출 전 정보를 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div>
                <label className="text-sm font-medium text-foreground">이메일</label>
                <input value={user?.email || ''} readOnly className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-muted text-foreground/80" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">메모(선택)</label>
                <textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  className="mt-1 w-full min-h-24 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="간단한 소개나 요청사항이 있다면 적어주세요"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? '신청 중...' : '신청하기'}</Button>
                <Button type="button" variant="outline" onClick={() => router.push(ROUTES.seminarDetail(id || ''))}>취소</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


