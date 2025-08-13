'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, BarChart3, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IncludeLogo } from '@/components/ui/logo';
import { ROUTES } from '@/config/constants';

const features = [
  {
    icon: Calendar,
    title: '세미나 관리',
    description: '세미나 생성, 일정 관리, 회차별 내용 구성이 간편합니다.',
  },
  {
    icon: Users,
    title: '참여자 관리',
    description: '신청자 승인, 정원 관리, 참여자 현황을 한눈에 확인하세요.',
  },
  {
    icon: BarChart3,
    title: '출석 통계',
    description: 'QR 코드 출석, 출석률 분석, 개인별 참여 현황을 제공합니다.',
  },
  {
    icon: Shield,
    title: '권한 관리',
    description: '관리자, 세미나장, 일반회원 역할에 따른 체계적 권한 관리.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(ROUTES.dashboard);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card text-card-foreground shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <img src="/icon.svg" alt="Include" className="w-10 h-10 rounded" />
              <div className="leading-tight">
                <h1 className="text-2xl font-bold text-foreground">Attendtion</h1>
                <div className="text-sm font-normal opacity-70">by include</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href={ROUTES.login}>
                <Button variant="ghost">로그인</Button>
              </Link>
              <Link href={ROUTES.register}>
                <Button>회원가입</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            동아리 세미나를 
            <br />
            <span className="text-primary">스마트하게 관리하세요</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            KAIST Include 동아리를 위한 세미나 출석 관리 시스템입니다.
            QR 코드 출석부터 통계까지, 모든 것을 한 곳에서 관리할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={ROUTES.register}>
              <Button size="lg" className="w-full sm:w-auto">
                지금 시작하기
              </Button>
            </Link>
            <Link href={ROUTES.seminars}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                세미나 둘러보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            왜 Include 출석 시스템일까요?
          </h2>
          <p className="text-lg text-muted-foreground">
            동아리 운영을 더욱 효율적으로 만드는 핵심 기능들
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center border border-border shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 시작해보세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            간편한 회원가입으로 모든 기능을 사용할 수 있습니다.
          </p>
          <Link href={ROUTES.register}>
            <Button size="lg" variant="secondary" className="text-foreground">
              무료로 시작하기
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-popover text-popover-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img src="/icon.svg" alt="Include" className="w-8 h-8 rounded" />
              <div className="leading-tight">
                <div className="text-xl font-bold">Attendtion</div>
                <div className="text-sm font-normal opacity-70">by include</div>
              </div>
            </div>
            <div className="text-muted-foreground">
              © 2025 KAIST Include. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
