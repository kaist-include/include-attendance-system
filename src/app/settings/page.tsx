"use client";

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ui/theme-toggle';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useRequireAuth();
  const { profile, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      await updateProfile({ nickname });
      alert('프로필이 저장되었습니다.');
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">설정</h1>
          <p className="text-muted-foreground mt-2">계정 정보와 환경 설정을 관리하세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>계정</CardTitle>
            <CardDescription>프로필 정보</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">이메일</label>
              <input
                value={user?.email || ''}
                readOnly
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-muted text-foreground/80"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">닉네임</label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="표시 이름"
              />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>환경</CardTitle>
            <CardDescription>테마 설정 및 접근성</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">테마</label>
              <div className="mt-2"><ThemeToggle /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


