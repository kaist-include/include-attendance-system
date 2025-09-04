import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IncludeLogo } from '@/components/ui/logo';
import { ROUTES } from '@/config/constants';
import { signup } from '@/app/auth/actions';
import Image from 'next/image';
export default function RegisterPage() {
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
          <p className="text-muted-foreground mt-2">새 계정을 만들어 시작하세요</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              Include 출석 시스템에 가입하여 세미나를 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signup} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  이름
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="pl-10 w-full px-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-colors placeholder:text-muted-foreground"
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="pl-10 w-full px-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-colors placeholder:text-muted-foreground"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="pl-10 w-full px-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-colors placeholder:text-muted-foreground"
                    placeholder="비밀번호를 입력하세요 (8자 이상)"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="pl-10 w-full px-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-colors placeholder:text-muted-foreground"
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
              >
                회원가입
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                이미 계정이 있으신가요?{' '}
                <Link
                  href={ROUTES.login}
                  className="text-primary hover:opacity-90 font-medium"
                >
                  로그인
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link
            href={ROUTES.home}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
} 