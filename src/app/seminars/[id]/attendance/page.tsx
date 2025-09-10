'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/spinner';
import QRCode from 'qrcode';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { Calendar, Clock, MapPin, Lightbulb, BookOpen, Users, CheckCircle, XCircle, Smartphone } from 'lucide-react';
// Manager interfaces (existing)
interface AttendanceSession {
  id: string;
  title: string;
  sessionNumber: number;
  date: string;
  durationMinutes: number;
  location: string | null;
  status: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkedAt: string | null;
  checkedBy: string | null;
  notes: string | null;
}

interface AttendanceData {
  seminar: {
    id: string;
    title: string;
  };
  sessions: AttendanceSession[];
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  attendances: Record<string, any>;
}

// Member interfaces (new)
interface MemberSession {
  id: string;
  sessionNumber: number;
  title: string;
  description: string;
  date: string;
  durationMinutes: number;
  location: string | null;
  status: string;
  attendance: {
    status: 'present' | 'absent' | 'late' | 'excused';
    checkedAt: string | null;
    checkedBy: string | null;
    notes: string | null;
  };
}

interface MemberAttendanceData {
  seminar: {
    id: string;
    title: string;
    isManager: boolean;
  };
  user: {
    id: string;
    email: string;
  };
  sessions: MemberSession[];
  statistics: {
    total: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    attendanceRate: number;
  };
}

export default function SeminarAttendancePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState<boolean | null>(null);

  // Manager state
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  
  // Member state
  const [memberData, setMemberData] = useState<MemberAttendanceData | null>(null);
  
  // QR Code state
  const [qrUrl, setQrUrl] = useState<string>('');
  const [numericCode, setNumericCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [generatingQr, setGeneratingQr] = useState(false);
  
  // Member attendance input state
  const [qrInput, setQrInput] = useState('');
  const [numericInput, setNumericInput] = useState('');
  const [scanningQr, setScanningQr] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  
  // Manager numeric code visibility state
  const [showNumericCode, setShowNumericCode] = useState(false);
  
  // Reset numeric code visibility when QR code changes
  useEffect(() => {
    setShowNumericCode(false);
  }, [qrUrl, numericCode]);
  

  
  // Update states
  const [updatingAttendance, setUpdatingAttendance] = useState<string | null>(null);

  // Auth is now handled by SSR middleware - no need for manual token handling

  // Determine user role and load appropriate data
  useEffect(() => {
    if (!id || authLoading || !user?.id) return;

    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check user role to determine which API to call
        const roleResponse = await fetch(`/api/seminars/${id}/check-role`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!mounted) return;

        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          const isUserManager = roleData.isManager;

          if (isUserManager) {
            // Load manager interface
            const managerResponse = await fetch(`/api/seminars/${id}/attendance`, {
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (managerResponse.ok) {
              const data: AttendanceData = await managerResponse.json();
              setAttendanceData(data);
              setIsManager(true);
              
              // Set first session as default if available and no session is selected
              if (data.sessions && data.sessions.length > 0 && !selectedSessionId) {
                setSelectedSessionId(data.sessions[0].id);
              }
            } else {
              const errorData = await managerResponse.json().catch(() => ({ error: 'Failed to load manager data' }));
              throw new Error(`Manager API error: ${errorData.error}`);
            }
          } else {
            // Load member interface
            const memberResponse = await fetch(`/api/seminars/${id}/my-attendance`, {
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!mounted) return;

            if (memberResponse.ok) {
              const data: MemberAttendanceData = await memberResponse.json();
              setMemberData(data);
              setIsManager(false);
            } else {
              const errorData = await memberResponse.json().catch(() => ({ error: 'Access denied' }));
              throw new Error(`Access denied: ${errorData.error}`);
            }
          }
        } else {
          throw new Error('Failed to check user role');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user?.id]); // Wait for auth to complete

  // Load specific session attendance (manager only)
  useEffect(() => {
    if (!selectedSessionId || !attendanceData || !isManager || authLoading || !user?.id) return;

    let mounted = true;

    const loadSessionAttendance = async () => {
      try {
        console.log('🔍 Loading session attendance for:', selectedSessionId);
        
        const response = await fetch(`/api/seminars/${id}/attendance/${selectedSessionId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 Session API Response status:', response.status);

        if (!mounted) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Session API Error Response:', errorData);
          throw new Error(`Failed to load session attendance: ${errorData.error || 'Unknown error'}`);
        }

        const sessionData = await response.json();
        console.log('✅ Session attendance data loaded:', sessionData);
        
        if (mounted) {
          setAttendees(sessionData.attendees);
          setCurrentSession(sessionData.session);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load session data');
          console.error('Error loading session attendance:', err);
        }
      }
    };

    loadSessionAttendance();

    return () => {
      mounted = false;
    };
  }, [selectedSessionId, id, attendanceData, isManager, authLoading, user?.id]);

  // Generate QR Code (manager only)
  const generateQr = useCallback(async () => {
    if (!selectedSessionId || !isManager || authLoading || !user?.id) return;

    try {
      setGeneratingQr(true);
      setError(null); // Clear any previous errors

      const response = await fetch(`/api/seminars/${id}/attendance/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate QR code');
      }

      const { qrData, numericCode: code, expiresAt: expiry } = await response.json();
      
      if (!qrData || !expiry) {
        throw new Error('Invalid QR code response from server');
      }
      
      // Generate QR code image
      const dataUrl = await QRCode.toDataURL(qrData, { 
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrUrl(dataUrl);
      setNumericCode(code || '');
      setExpiresAt(new Date(expiry).getTime());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(errorMessage);
      console.error('Error generating QR code:', err);
    } finally {
      setGeneratingQr(false);
    }
  }, [selectedSessionId, isManager, authLoading, user?.id, id]);

    // Update attendance status (manager only)
  const setStatus = async (userId: string, status: Attendee['status']) => {
    if (!selectedSessionId || !isManager || authLoading || !user?.id) return;

    try {
      setUpdatingAttendance(userId);
      setError(null); // Clear any previous errors

      console.log('🔄 Updating attendance:', { userId, status, sessionId: selectedSessionId });

      const response = await fetch(`/api/seminars/${id}/attendance/${selectedSessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status }),
      });

      console.log('📡 Attendance update response status:', response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Raw error response:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${responseText || 'Unknown error'}` };
        }
        
        throw new Error(errorData.error || 'Failed to update attendance');
      }

      const result = await response.json();
      console.log('✅ Attendance updated successfully:', result);

      // Update local state
      setAttendees(prev => prev.map(a => 
        a.id === userId 
          ? { ...a, status, checkedAt: new Date().toISOString() }
          : a
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update attendance';
      setError(errorMessage);
      console.error('❌ Error updating attendance:', err);
    } finally {
      setUpdatingAttendance(null);
    }
  };

  // Handle QR scan or numeric code (member only)
  const handleQrScan = async () => {
    if ((!qrInput.trim() && !numericInput.trim()) || scanningQr || authLoading || !user?.id) return;

    try {
      setScanningQr(true);
      setScanMessage('');

      const response = await fetch(`/api/seminars/${id}/attendance/qr`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qrData: qrInput.trim() || null, 
          numericCode: numericInput.trim() || null 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setScanMessage('출석이 성공적으로 처리되었습니다!');
        setMessageType('success');
        setQrInput('');
        setNumericInput('');
        // Refresh member data to show updated attendance
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setScanMessage(result.error || '출석 처리 중 오류가 발생했습니다.');
        setMessageType('error');
        // Clear error message after 5 seconds
        setTimeout(() => {
          setScanMessage('');
          setMessageType(null);
        }, 5000);
      }
    } catch (err) {
      setScanMessage(err instanceof Error ? err.message : '출석 처리 중 오류가 발생했습니다.');
      setMessageType('error');
      console.error('Error scanning QR:', err);
      // Clear error message after 5 seconds
      setTimeout(() => {
        setScanMessage('');
        setMessageType(null);
      }, 5000);
    } finally {
      setScanningQr(false);
    }
  };

  // Calculate remaining seconds for QR expiry with real-time updates
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  // Format remaining time as "x분 x초"
  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0) return '만료됨';
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}분 ${remainingSecs}초`;
    }
    return `${remainingSecs}초`;
  };

  // Update remaining seconds every second and auto-refresh QR when expired
  useEffect(() => {
    if (!expiresAt || !selectedSessionId || !isManager || authLoading || !user?.id) {
      setRemainingSeconds(0);
      return;
    }
    
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      
      if (remaining === 0) {
        generateQr();
      }
    };
    
    // Initial update
    updateTimer();
    
    const timer = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt, selectedSessionId, isManager, authLoading, user?.id, generateQr]);

  // Generate QR on session change (manager only)
  useEffect(() => {
    if (selectedSessionId && isManager && !authLoading && user?.id) {
      generateQr();
    }
  }, [selectedSessionId, isManager, authLoading, user?.id, generateQr]);

  // Calculate statistics (manager only)
  const managerStats = useMemo(() => {
    if (!isManager || !attendees) return null;
    const total = attendees.length;
    const present = attendees.filter(a => a.status === 'present').length;
    const late = attendees.filter(a => a.status === 'late').length;
    const excused = attendees.filter(a => a.status === 'excused').length;
    const absent = attendees.filter(a => a.status === 'absent').length;
    return { 
      total, 
      present, 
      late, 
      excused, 
      absent,
      rate: total ? Math.round((present / total) * 100) : 0 
    };
  }, [attendees, isManager]);

  // Loading state
  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
                    <LoadingSpinner />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error || (!attendanceData && !memberData)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || '출석 정보를 찾을 수 없습니다.'}</p>
            <Button onClick={() => router.push(`/seminars/${id}`)}>세미나로 돌아가기</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Member UI
  const shouldShowMemberUI = isManager === false && !!memberData && !!memberData.seminar && !!memberData.statistics;

  if (shouldShowMemberUI) {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">내 출석 현황</h1>
              <p className="text-muted-foreground">{memberData?.seminar?.title || '세미나'}</p>
            </div>
          <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>
                세미나로 돌아가기
              </Button>
            </div>
          </div>

          {/* Member Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>출석 통계</CardTitle>
              <CardDescription>전체 세션에 대한 나의 출석 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">총 세션</div>
                  <div className="text-2xl font-bold text-foreground">{memberData?.statistics?.total || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">출석</div>
                  <div className="text-2xl font-bold text-green-600">{memberData?.statistics?.present || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">지각</div>
                  <div className="text-2xl font-bold text-yellow-600">{memberData?.statistics?.late || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">공결</div>
                  <div className="text-2xl font-bold text-blue-600">{memberData?.statistics?.excused || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">결석</div>
                  <div className="text-2xl font-bold text-red-600">{memberData?.statistics?.absent || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">출석률</div>
                  <div className="text-2xl font-bold text-foreground">{memberData?.statistics?.attendanceRate || 0}%</div>
                  <Progress 
                    value={memberData?.statistics?.attendanceRate || 0} 
                    className="mt-2 h-2 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member QR Scan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                출석하기
              </CardTitle>
              <CardDescription>스마트폰으로 QR 코드를 스캔하거나 6자리 숫자 코드를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-6">
                {/* QR Scan Instructions */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-center space-y-2">
                    <Smartphone className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" />
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">스마트폰으로 QR 스캔</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      관리자 화면의 QR 코드를 스캔하면<br/>
                      자동으로 출석 처리됩니다!
                    </p>
                  </div>
                </div>
                
                {/* Numeric Code Input */}
                <div className="text-center">
                  <div className="mb-4">
                    <div className="text-lg font-medium text-foreground mb-2">또는 6자리 코드 입력</div>
                    <div className="flex justify-center gap-2">
                      <input
                        type="text"
                        value={numericInput}
                        onChange={(e) => setNumericInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-40 px-4 py-3 rounded-lg border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center font-mono text-2xl tracking-widest"
                        disabled={scanningQr}
                        maxLength={6}
                      />
                      <Button 
                        onClick={handleQrScan}
                        disabled={numericInput.length !== 6 || scanningQr}
                        size="lg"
                      >
                        {scanningQr ? '처리 중...' : '출석!'}
                      </Button>
                    </div>
                  </div>
                </div>

                {scanMessage && (
                  <div className={`p-4 rounded-lg text-sm text-center flex items-center justify-center gap-2 ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {messageType === 'success' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{scanMessage}</span>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground text-center">
                  <Lightbulb className="w-3 h-3 inline mr-1" />
                QR 스캔이 더 빠르고 편리합니다!
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member Session List */}
          <Card>
            <CardHeader>
              <CardTitle>세션별 출석 현황</CardTitle>
              <CardDescription>각 세션의 출석 상태를 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!memberData?.sessions || memberData.sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="mx-auto mb-4 w-16 h-16 opacity-30" />
                    <p>등록된 세션이 없습니다</p>
                  </div>
                ) : (
                  memberData.sessions.map(session => (
                    <div key={session.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm text-muted-foreground font-medium">
                              {session.sessionNumber}회차
                            </span>
                            <h3 className="font-medium text-foreground">{session.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                              session.attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              session.attendance.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {session.attendance.status === 'present' ? '출석' :
                               session.attendance.status === 'late' ? '지각' :
                               session.attendance.status === 'excused' ? '공결' :
                               '결석'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{session.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(session.date).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.durationMinutes}분
                </span>
                {session.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.location}
                  </span>
                )}
                          </div>
                          {session.attendance.checkedAt && (
                            <div className="text-xs text-muted-foreground mt-2">
                              체크 시간: {new Date(session.attendance.checkedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Manager UI (existing functionality)
  if (isManager === true && attendanceData && attendanceData.seminar) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">출석 관리</h1>
              <p className="text-muted-foreground">{attendanceData?.seminar?.title || '세미나'}</p>
              <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                관리자 모드
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>
                세미나로 돌아가기
              </Button>
          </div>
        </div>

          {/* Manager QR Code */}
        <Card>
          <CardHeader>
            <CardTitle>출석 QR 코드</CardTitle>
            <CardDescription>빠른 출석 체크를 위한 QR 코드 (자동 갱신)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>회차 선택</Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="세션을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceData?.sessions?.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.sessionNumber}회차 · {s.title} · {new Date(s.date).toLocaleDateString()}
                      </SelectItem>
                    )) || (
                      <SelectItem key="loading" value="" disabled>세션 로딩 중...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                  {error && error.includes('QR') ? (
                    <>
                      <div className="w-64 h-64 flex flex-col items-center justify-center space-y-4">
                        <Alert variant="destructive" className="w-full">
                          <AlertDescription className="text-center text-sm">
                            {error}
                          </AlertDescription>
                        </Alert>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={generateQr}
                          disabled={generatingQr || authLoading}
                        >
                          다시 시도
                        </Button>
                      </div>
                      <Button 
                        className="mt-2" 
                        variant="outline" 
                        onClick={generateQr}
                        disabled={generatingQr || authLoading || !selectedSessionId}
                      >
                        {generatingQr ? 'QR 생성 중...' : 'QR 갱신'}
                      </Button>
                    </>
                  ) : qrUrl ? (
                    <>
                      <Image src={qrUrl} alt="attendance qr" width={256} height={256} className="w-64 h-64" />
                      <div className="mt-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          유효 시간: {formatRemainingTime(remainingSeconds)}
                        </p>
                        {numericCode && (
                          <div className="mt-3 p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground">6자리 출석 코드:</p>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowNumericCode(!showNumericCode)}
                                className="h-6 px-2 text-xs"
                              >
                                {showNumericCode ? '숨기기' : '보기'}
                              </Button>
                            </div>
                            {showNumericCode ? (
                              <p className="text-3xl font-mono font-bold text-foreground tracking-wider">
                                {numericCode}
                              </p>
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={() => setShowNumericCode(true)}
                                className="text-3xl font-mono font-bold text-muted-foreground tracking-wider h-auto p-2"
                              >
                                ••••••
                              </Button>
                            )}
                            <p className="text-xs text-muted-foreground mt-2 opacity-70">
                              <Lightbulb className="w-3 h-3 inline mr-1" />
                QR 스캔을 권장합니다. 숫자 코드는 필요시에만 사용하세요.
                            </p>
                          </div>
                        )}
                      </div>
                      <Button 
                        className="mt-2" 
                        variant="outline" 
                        onClick={generateQr}
                        disabled={generatingQr || authLoading || !selectedSessionId}
                      >
                        {generatingQr ? 'QR 생성 중...' : 'QR 갱신'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-center text-sm">
                          {generatingQr ? 'QR 코드 생성 중...' : 'QR 코드를 생성하세요'}
                        </span>
                      </div>
                      <Button 
                        className="mt-2" 
                        variant="outline" 
                        onClick={generateQr}
                        disabled={generatingQr || authLoading || !selectedSessionId}
                      >
                        {generatingQr ? 'QR 생성 중...' : 'QR 갱신'}
                      </Button>
                    </>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Manager Attendance Management */}
        <Card>
          <CardHeader>
            <CardTitle>출석 현황</CardTitle>
              <CardDescription>
                {currentSession ? 
                  `${currentSession.sessionNumber}회차 - ${currentSession.title} (${new Date(currentSession.date).toLocaleDateString()})` 
                  : '수동 출석 및 통계'
                }
              </CardDescription>
          </CardHeader>
          <CardContent>
              {managerStats && attendees && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
              <div>
                <div className="text-sm text-muted-foreground">총원</div>
                    <div className="text-2xl font-bold text-foreground">{managerStats?.total || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">출석</div>
                    <div className="text-2xl font-bold text-green-600">{managerStats?.present || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">지각</div>
                    <div className="text-2xl font-bold text-yellow-600">{managerStats?.late || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">공결</div>
                    <div className="text-2xl font-bold text-blue-600">{managerStats?.excused || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">출석률</div>
                    <div className="text-2xl font-bold text-foreground">{managerStats?.rate || 0}%</div>
              </div>
            </div>
              )}

              <div className="space-y-3">
                {!attendees || attendees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto mb-4 w-16 h-16 opacity-30" />
                    <p>등록된 학생이 없습니다</p>
                  </div>
                ) : (
                  attendees.map(a => (
                <div key={a.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{a.name}</div>
                    <div className="text-sm text-muted-foreground">{a.email}</div>
                        {a.checkedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            체크 시간: {new Date(a.checkedAt).toLocaleString()}
                          </div>
                        )}
                  </div>
                  <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant={a.status === 'present' ? 'default' : 'outline'} 
                          onClick={() => setStatus(a.id, 'present')}
                          disabled={updatingAttendance === a.id}
                        >
                          출석
                        </Button>
                        <Button 
                          size="sm" 
                          variant={a.status === 'late' ? 'default' : 'outline'} 
                          onClick={() => setStatus(a.id, 'late')}
                          disabled={updatingAttendance === a.id}
                        >
                          지각
                        </Button>
                        <Button 
                          size="sm" 
                          variant={a.status === 'excused' ? 'default' : 'outline'} 
                          onClick={() => setStatus(a.id, 'excused')}
                          disabled={updatingAttendance === a.id}
                        >
                          공결
                        </Button>
                        <Button 
                          size="sm" 
                          variant={a.status === 'absent' ? 'default' : 'outline'} 
                          onClick={() => setStatus(a.id, 'absent')}
                          disabled={updatingAttendance === a.id}
                        >
                          결석
                        </Button>
                  </div>
                </div>
                  ))
                )}
            </div>
          </CardContent>
        </Card>
        </div>
      </MainLayout>
    );
  }

  // Fallback
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-muted-foreground">접근 권한을 확인하는 중...</p>
        </div>
      </div>
    </MainLayout>
  );
}


