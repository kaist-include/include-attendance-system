import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/constants';
import Image from 'next/image';

interface ErrorPageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const { message } = await searchParams;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={ROUTES.home} className="inline-flex items-center space-x-2">
            <Image src="/icon.svg" alt="Include" className="w-12 h-12 rounded" />
            <div className="leading-tight">
              <span className="text-2xl font-bold text-foreground">Attendtion</span>
              <div className="text-sm font-normal opacity-70">by include</div>
            </div>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">인증 오류</CardTitle>
            <CardDescription>
              로그인 또는 회원가입 중 문제가 발생했습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {message && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                {decodeURIComponent(message)}
              </div>
            )}

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href={ROUTES.login}>다시 로그인 시도</Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href={ROUTES.register}>회원가입</Link>
              </Button>
            </div>

            <div className="mt-6">
              <Link
                href={ROUTES.home}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← 홈으로 돌아가기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 