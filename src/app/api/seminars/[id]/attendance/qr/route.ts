import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomBytes } from 'crypto';

// Generate QR code token for attendance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    
    // Get authenticated user from session (handled by middleware)

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Missing required field: sessionId' 
      }, { status: 400 });
    }

    // Check if session exists and user can manage it
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        seminars!inner (
          owner_id,
          title
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = session.seminars.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Generate QR code token and 6-digit numeric code (valid for 10 minutes)
    const qrCode = randomBytes(16).toString('hex');
    const numericCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // TODO: Store QR codes in a separate table for better management
    // For now, we'll return the QR code data without storing it persistently
    console.log('✅ QR code generated for session:', sessionId);

    // Create scannable URL for QR code
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    // Use environment variable for production URL or fallback to host header
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const qrUrl = `${baseUrl}/attendance/scan?token=${qrCode}&session=${sessionId}&seminar=${seminarId}`;

    return NextResponse.json({
      qrData: qrUrl, // Now contains a scannable URL instead of JSON
      numericCode,
      expiresAt: expiresAt.toISOString(),
      qrCode
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Verify QR code and mark attendance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    const { qrData, numericCode } = await request.json();

    if (!qrData && !numericCode) {
      return NextResponse.json({ 
        error: 'Missing required field: qrData or numericCode' 
      }, { status: 400 });
    }

    let sessionId, qrCode, expiresAt;
    
    if (numericCode) {
      // TODO: Implement proper QR code lookup from QR codes table
      // For now, we'll disable numeric code verification
      return NextResponse.json({ error: 'Numeric code verification not yet implemented' }, { status: 501 });
    } else {
      // Handle QR data input
      let parsedQrData;
      try {
        parsedQrData = JSON.parse(qrData);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid QR data format' }, { status: 400 });
      }

      ({ session_id: sessionId, qr_code: qrCode, expires_at: expiresAt } = parsedQrData);

      if (!sessionId || !qrCode || !expiresAt) {
        return NextResponse.json({ error: 'Invalid QR data' }, { status: 400 });
      }
    }

    // Check if QR code is expired
    if (new Date() > new Date(expiresAt)) {
      return NextResponse.json({ error: 'QR code has expired' }, { status: 400 });
    }

    // Verify QR code against session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('materials_url, seminar_id')
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Parse materials_url to get QR data
    let sessionQrData;
    try {
      sessionQrData = JSON.parse(session.materials_url);
    } catch (e) {
      return NextResponse.json({ error: 'No active QR code for this session' }, { status: 400 });
    }

    // Verify QR code matches
    if (sessionQrData.qr_code !== qrCode) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 });
    }

    // Check if QR code is still valid (server-side expiration check)
    if (new Date() > new Date(sessionQrData.expires_at)) {
      return NextResponse.json({ error: 'QR code has expired' }, { status: 400 });
    }

    // Check if user is enrolled in the seminar
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('seminar_id', seminarId)
      .eq('status', 'approved')
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'User is not enrolled in this seminar' }, { status: 400 });
    }

    // Mark attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendances')
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        status: 'present',
        checked_at: new Date().toISOString(),
        checked_by: user.id, // Self-checked via QR/numeric code
        notes: `QR 코드로 자동 출석 확인 (${new Date().toLocaleString('ko-KR')})`
      })
      .select()
      .single();

    if (attendanceError) {
      console.error('Error marking attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
    }

    // Get seminar title for response
    const { data: seminarInfo } = await supabase
      .from('seminars')
      .select('title')
      .eq('id', seminarId)
      .single();

    return NextResponse.json({ 
      message: 'Attendance marked successfully',
      attendance,
      seminarTitle: seminarInfo?.title || ''
    });

  } catch (error) {
    console.error('Error in PUT attendance/qr:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 