'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
      
      const response = await fetch(`/api/seminars/${id}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: memo.trim() || null
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || '신청이 완료되었습니다. 승인을 기다려주세요.');
        router.push(ROUTES.seminarDetail(id));
      } else {
        alert(`신청 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">세미나 신청</h1>
          <p className="text-muted-foreground mt-2">신청 후 세미나 개설자의 승인을 기다려주세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>신청 정보</CardTitle>
            <CardDescription>모든 신청은 세미나 개설자의 승인이 필요합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input 
                  value={user?.email || ''} 
                  readOnly 
                  className="bg-muted text-foreground/80" 
                />
              </div>
              <div className="space-y-2">
                <Label>신청 메모 (선택)</Label>
                <Textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  className="min-h-24"
                  placeholder="세미나 개설자에게 전달할 메시지나 간단한 자기소개를 적어주세요"
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


