'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
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
  const { user } = useAuth();

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
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [generatingQr, setGeneratingQr] = useState(false);
  
  // Member QR scan state
  const [qrInput, setQrInput] = useState<string>('');
  const [scanningQr, setScanningQr] = useState(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  
  // Update states
  const [updatingAttendance, setUpdatingAttendance] = useState<string | null>(null);

  // Auth is now handled by SSR middleware - no need for manual token handling

  // Determine user role and load appropriate data
  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!user?.id) {
          throw new Error('Authentication required');
        }

        console.log('🔍 Checking user role for attendance access');

        // First, try to access manager API - auth handled by middleware
        const managerResponse = await fetch(`/api/seminars/${id}/attendance`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!mounted) return;

        if (managerResponse.ok) {
          // User is a manager
          console.log('✅ User is a manager - loading manager interface');
          const data: AttendanceData = await managerResponse.json();
          setAttendanceData(data);
          setIsManager(true);
          
          // Set first session as default if available and no session is selected
          if (data.sessions.length > 0 && !selectedSessionId) {
            setSelectedSessionId(data.sessions[0].id);
          }
        } else if (managerResponse.status === 403) {
          // User is not a manager, try member API
          console.log('👤 User is not a manager - trying member access');
          const memberResponse = await fetch(`/api/seminars/${id}/my-attendance`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!mounted) return;

          if (memberResponse.ok) {
            console.log('✅ User is an enrolled member - loading member interface');
            const data: MemberAttendanceData = await memberResponse.json();
            setMemberData(data);
            setIsManager(false);
          } else {
            const errorData = await memberResponse.json().catch(() => ({ error: 'Access denied' }));
            throw new Error(`Access denied: ${errorData.error}`);
          }
        } else {
          const errorData = await managerResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Failed to load data: ${errorData.error}`);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          console.error('Error loading attendance data:', err);
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
  }, [id]); // Removed selectedSessionId and user?.id from dependencies to prevent infinite loop

  // Load specific session attendance (manager only)
  useEffect(() => {
    if (!selectedSessionId || !attendanceData || !isManager) return;

    let mounted = true;

    const loadSessionAttendance = async () => {
      try {
        if (!user?.id) {
          throw new Error('Authentication required');
        }

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
  }, [selectedSessionId, id, attendanceData, isManager, user?.id]);

  // Generate QR Code (manager only)
  const generateQr = useCallback(async () => {
    if (!selectedSessionId || !isManager) return;

    try {
      setGeneratingQr(true);
      
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/attendance/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const { qrData, expiresAt: expiry } = await response.json();
      
      // Generate QR code image
      const dataUrl = await QRCode.toDataURL(qrData, { width: 256 });
      setQrUrl(dataUrl);
      setExpiresAt(new Date(expiry).getTime());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      console.error('Error generating QR code:', err);
    } finally {
      setGeneratingQr(false);
    }
  }, [selectedSessionId, isManager, user?.id, id]);

  // Update attendance status (manager only)
  const setStatus = async (userId: string, status: Attendee['status']) => {
    if (!selectedSessionId || !isManager) return;

    try {
      setUpdatingAttendance(userId);
      
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/attendance/${selectedSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update attendance');
      }

      // Update local state
      setAttendees(prev => prev.map(a => 
        a.id === userId 
          ? { ...a, status, checkedAt: new Date().toISOString() }
          : a
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance');
      console.error('Error updating attendance:', err);
    } finally {
      setUpdatingAttendance(null);
    }
  };

  // Handle QR scan (member only)
  const handleQrScan = async () => {
    if (!qrInput.trim() || scanningQr) return;

    try {
      setScanningQr(true);
      setScanMessage('');
      
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/attendance/qr`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: qrInput.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        setScanMessage('✅ 출석이 성공적으로 처리되었습니다!');
        setQrInput('');
        // Refresh member data to show updated attendance
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setScanMessage(`❌ ${result.error || '출석 처리 중 오류가 발생했습니다.'}`);
        // Clear error message after 5 seconds
        setTimeout(() => {
          setScanMessage('');
        }, 5000);
      }
    } catch (err) {
      setScanMessage(`❌ ${err instanceof Error ? err.message : '출석 처리 중 오류가 발생했습니다.'}`);
      console.error('Error scanning QR:', err);
      // Clear error message after 5 seconds
      setTimeout(() => {
        setScanMessage('');
      }, 5000);
    } finally {
      setScanningQr(false);
    }
  };

  // Calculate remaining seconds for QR expiry
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  // Auto-refresh QR code when expired (manager only)
  useEffect(() => {
    if (!expiresAt || !selectedSessionId || !isManager) return;
    
    const timer = setInterval(() => {
      if (Date.now() >= expiresAt) {
        generateQr();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt, selectedSessionId, isManager, generateQr]);

  // Generate QR on session change (manager only)
  useEffect(() => {
    if (selectedSessionId && isManager) {
      generateQr();
    }
  }, [selectedSessionId, isManager, generateQr]);

  // Calculate statistics (manager only)
  const managerStats = useMemo(() => {
    if (!isManager) return null;
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
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">출석 정보를 불러오는 중...</p>
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
  if (isManager === false && memberData) {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">내 출석 현황</h1>
              <p className="text-muted-foreground">{memberData.seminar.title}</p>
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
                  <div className="text-2xl font-bold text-foreground">{memberData.statistics.total}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">출석</div>
                  <div className="text-2xl font-bold text-green-600">{memberData.statistics.present}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">지각</div>
                  <div className="text-2xl font-bold text-yellow-600">{memberData.statistics.late}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">공결</div>
                  <div className="text-2xl font-bold text-blue-600">{memberData.statistics.excused}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">결석</div>
                  <div className="text-2xl font-bold text-red-600">{memberData.statistics.absent}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">출석률</div>
                  <div className="text-2xl font-bold text-foreground">{memberData.statistics.attendanceRate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member QR Scan */}
          <Card>
            <CardHeader>
              <CardTitle>QR 코드로 출석하기</CardTitle>
              <CardDescription>관리자가 제공한 QR 코드를 스캔하거나 입력하여 출석 체크하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="QR 코드 데이터를 입력하세요"
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={scanningQr}
                  />
                  <Button 
                    onClick={handleQrScan}
                    disabled={!qrInput.trim() || scanningQr}
                  >
                    {scanningQr ? '처리 중...' : '출석 체크'}
                  </Button>
                </div>
                {scanMessage && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    scanMessage.includes('✅') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {scanMessage}
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  💡 팁: 관리자가 화면에 표시한 QR 코드를 스마트폰으로 스캔하거나, QR 코드 텍스트를 복사해서 위 입력창에 붙여넣으세요.
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
                {memberData.sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <span className="block text-6xl mb-4 opacity-30">📚</span>
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
                            <span>📅 {new Date(session.date).toLocaleString()}</span>
                            <span>⏱️ {session.durationMinutes}분</span>
                            {session.location && <span>📍 {session.location}</span>}
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
  if (isManager === true && attendanceData) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">출석 관리</h1>
              <p className="text-muted-foreground">{attendanceData.seminar.title}</p>
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
                <label className="text-sm font-medium text-foreground">회차 선택</label>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    {attendanceData.sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.sessionNumber}회차 · {s.title} · {new Date(s.date).toLocaleDateString()}
                      </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                  {qrUrl ? (
                  <Image src={qrUrl} alt="attendance qr" className="w-64 h-64" />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground rounded">
                      <span className="text-muted-foreground">QR 코드 생성 중...</span>
                    </div>
                )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    유효 시간: {remainingSeconds}초
                  </p>
                  <Button 
                    className="mt-2" 
                    variant="outline" 
                    onClick={generateQr}
                    disabled={generatingQr}
                  >
                    {generatingQr ? 'QR 생성 중...' : 'QR 갱신'}
                  </Button>
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
              {managerStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
              <div>
                <div className="text-sm text-muted-foreground">총원</div>
                    <div className="text-2xl font-bold text-foreground">{managerStats.total}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">출석</div>
                    <div className="text-2xl font-bold text-green-600">{managerStats.present}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">지각</div>
                    <div className="text-2xl font-bold text-yellow-600">{managerStats.late}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">공결</div>
                    <div className="text-2xl font-bold text-blue-600">{managerStats.excused}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">출석률</div>
                    <div className="text-2xl font-bold text-foreground">{managerStats.rate}%</div>
              </div>
            </div>
              )}

              <div className="space-y-3">
                {attendees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <span className="block text-6xl mb-4 opacity-30">👥</span>
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


