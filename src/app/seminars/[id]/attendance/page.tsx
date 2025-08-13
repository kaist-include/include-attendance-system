'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';

interface Attendee {
  id: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export default function SeminarAttendancePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();

  const [sessions] = useState([
    { id: 's1', title: '1회차', date: '2025-01-20' },
    { id: 's2', title: '2회차', date: '2025-01-27' },
  ]);
  const [selectedSessionId, setSelectedSessionId] = useState('s1');
  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: 'u1', name: '김학생', email: 'kim@example.com', status: 'present' },
    { id: 'u2', name: '박학생', email: 'park@example.com', status: 'absent' },
    { id: 'u3', name: '이학생', email: 'lee@example.com', status: 'late' },
  ]);

  const [qrUrl, setQrUrl] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);

  const generateQr = async () => {
    const payload = {
      session_id: selectedSessionId,
      seminar_id: id,
      timestamp: Date.now(),
      expires_at: Date.now() + 1000 * 60 * 10, // 10분 유효
    };
    const text = JSON.stringify(payload);
    const dataUrl = await QRCode.toDataURL(text, { width: 256 });
    setQrUrl(dataUrl);
    setExpiresAt(payload.expires_at);
  };

  useEffect(() => {
    generateQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      if (Date.now() >= expiresAt) {
        generateQr();
      } else {
        setExpiresAt(prev => prev); // trigger rerender via state deps in component
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const stats = useMemo(() => {
    const total = attendees.length;
    const present = attendees.filter(a => a.status === 'present').length;
    const late = attendees.filter(a => a.status === 'late').length;
    const excused = attendees.filter(a => a.status === 'excused').length;
    return { total, present, late, excused, rate: total ? Math.round((present / total) * 100) : 0 };
  }, [attendees]);

  const setStatus = (uid: string, status: Attendee['status']) => {
    setAttendees(prev => prev.map(a => a.id === uid ? { ...a, status } : a));
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">출석 관리</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>세미나로 돌아가기</Button>
          </div>
        </div>

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
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.title} · {s.date}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                {qrUrl && (
                  <img src={qrUrl} alt="attendance qr" className="w-64 h-64" />
                )}
                <p className="mt-2 text-sm text-muted-foreground">유효 시간: {remainingSeconds}초</p>
                <Button className="mt-2" variant="outline" onClick={generateQr}>QR 갱신</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>출석 현황</CardTitle>
            <CardDescription>수동 출석 및 통계</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">총원</div>
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">출석</div>
                <div className="text-2xl font-bold text-foreground">{stats.present}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">출석률</div>
                <div className="text-2xl font-bold text-foreground">{stats.rate}%</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {attendees.map(a => (
                <div key={a.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{a.name}</div>
                    <div className="text-sm text-muted-foreground">{a.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={a.status === 'present' ? 'default' : 'outline'} onClick={() => setStatus(a.id, 'present')}>출석</Button>
                    <Button size="sm" variant={a.status === 'late' ? 'default' : 'outline'} onClick={() => setStatus(a.id, 'late')}>지각</Button>
                    <Button size="sm" variant={a.status === 'excused' ? 'default' : 'outline'} onClick={() => setStatus(a.id, 'excused')}>공결</Button>
                    <Button size="sm" variant={a.status === 'absent' ? 'default' : 'outline'} onClick={() => setStatus(a.id, 'absent')}>결석</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


