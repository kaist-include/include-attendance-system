"use client";

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ROUTES } from '@/config/constants';

export default function AdminPage() {
  useRequireAuth();
  const { isAdmin, isSeminarLeader } = useAuth();

  const allowed = isAdmin || isSeminarLeader;

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
          </div>
        )}
      </div>
    </MainLayout>
  );
}


