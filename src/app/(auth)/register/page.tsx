'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/config/constants';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 비밀번호 길이 확인
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }

    try {
      await signUp(formData.email, formData.password, formData.name);
      // 회원가입 성공 시 로그인 페이지로 이동
      router.push(ROUTES.login + '?message=signup-success');
    } catch (err: any) {
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name && formData.email && formData.password && formData.confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={ROUTES.home} className="inline-flex items-center space-x-2">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">I</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Include</span>
          </Link>
          <p className="text-gray-600 mt-2">새 계정을 만들어 시작하세요</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              Include 출석 시스템에 가입하여 세미나를 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  이름
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="비밀번호를 입력하세요 (8자 이상)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? '회원가입 중...' : '회원가입'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link
                  href={ROUTES.login}
                  className="text-blue-600 hover:text-blue-500 font-medium"
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
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
} 