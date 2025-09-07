'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

// Separate component that uses useSearchParams
function AttendanceScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [seminarTitle, setSeminarTitle] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const sessionId = searchParams.get('session');
    const seminarId = searchParams.get('seminar');

    if (!token || !sessionId || !seminarId) {
      setStatus('error');
      setMessage('잘못된 QR 코드입니다.');
      return;
    }

    const processAttendance = async () => {
      try {
        const response = await fetch(`/api/seminars/${seminarId}/attendance/qr`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            qrData: JSON.stringify({
              seminar_id: seminarId,
              session_id: sessionId,
              qr_code: token,
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              timestamp: Date.now()
            })
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('출석이 성공적으로 처리되었습니다!');
          setSeminarTitle(result.seminarTitle || '');
          
          // Redirect to seminar page after 3 seconds
          setTimeout(() => {
            router.push(`/seminars/${seminarId}`);
          }, 3000);
        } else {
          if (result.error?.includes('expired')) {
            setStatus('expired');
            setMessage('QR 코드가 만료되었습니다. 새로운 QR 코드를 요청하세요.');
          } else {
            setStatus('error');
            setMessage(result.error || '출석 처리 중 오류가 발생했습니다.');
          }
        }
      } catch (err) {
        setStatus('error');
        setMessage('출석 처리 중 오류가 발생했습니다.');
        console.error('Error processing attendance:', err);
      }
    };

    processAttendance();
  }, [searchParams, router]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'expired':
        return <Clock className="w-16 h-16 text-orange-600" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-600" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return '출석 처리 중...';
      case 'success':
        return '출석 완료!';
      case 'expired':
        return 'QR 코드 만료';
      case 'error':
        return '출석 실패';
      default:
        return '';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'expired':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            {getIcon()}
            <div>
              <CardTitle className={`text-xl ${getColor()}`}>
                {getTitle()}
              </CardTitle>
              {seminarTitle && status === 'success' && (
                <CardDescription className="mt-2">
                  {seminarTitle} 출석 완료
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <p className="text-xs text-muted-foreground">
              3초 후 세미나 페이지로 자동 이동됩니다...
            </p>
          )}
          
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              이전으로
            </Button>
            
            {status !== 'loading' && (
              <Button
                onClick={() => router.push('/dashboard')}
                variant={status === 'success' ? 'default' : 'outline'}
              >
                대시보드로
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback component
function AttendanceScanLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
            <div>
              <CardTitle className="text-xl text-blue-600">
                출석 처리 중...
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">QR 코드를 확인하고 있습니다...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main page component with Suspense boundary
export default function AttendanceScanPage() {
  return (
    <MainLayout>
      <Suspense fallback={<AttendanceScanLoading />}>
        <AttendanceScanContent />
      </Suspense>
    </MainLayout>
  );
} 