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
    const numericCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store QR codes in database for verification
    const { error: insertError } = await supabase
      .from('qr_codes')
      .insert({
        session_id: sessionId,
        seminar_id: seminarId,
        qr_code: qrCode,
        numeric_code: numericCode,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      });

    if (insertError) {
      console.error('Error storing QR code:', insertError);
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
    }

    console.log('✅ QR code generated and stored for session:', sessionId);

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
      // Look up numeric code in qr_codes table
      const { data: qrCodeData, error: qrCodeError } = await supabase
        .from('qr_codes')
        .select('session_id, qr_code, expires_at, seminar_id')
        .eq('numeric_code', numericCode)
        .eq('seminar_id', seminarId)
        .single();

      if (qrCodeError || !qrCodeData) {
        return NextResponse.json({ error: 'Invalid or expired numeric code' }, { status: 400 });
      }

      sessionId = qrCodeData.session_id;
      qrCode = qrCodeData.qr_code;
      expiresAt = qrCodeData.expires_at;
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

    // Verify session exists and get seminar info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        seminar_id,
        external_url,
        seminars!inner (
          id,
          title,
          owner_id
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    if (sessionError || !session) {
      console.error('Session lookup error:', sessionError);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // For numeric codes, we already verified the code exists in qr_codes table
    // For QR codes, verify the QR code exists in qr_codes table
    if (!numericCode) {
      // Verify QR code exists in our qr_codes table
      const { data: storedQrCode, error: qrVerifyError } = await supabase
        .from('qr_codes')
        .select('id, expires_at')
        .eq('qr_code', qrCode)
        .eq('session_id', sessionId)
        .eq('seminar_id', seminarId)
        .single();

      if (qrVerifyError || !storedQrCode) {
        console.error('QR code verification error:', qrVerifyError);
        return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 400 });
      }

      // Double-check expiration from stored data
      if (new Date() > new Date(storedQrCode.expires_at)) {
        return NextResponse.json({ error: 'QR code has expired' }, { status: 400 });
      }
    }

    // Check if user is enrolled in the seminar
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('seminar_id', seminarId)
      .eq('status', 'approved')
      .single();

    if (enrollmentError || !enrollment) {
      console.error('Enrollment check error:', enrollmentError);
      console.log('User enrollment check - User ID:', user.id, 'Seminar ID:', seminarId);
      return NextResponse.json({ error: 'You are not enrolled in this seminar or your enrollment is not approved' }, { status: 403 });
    }

    // Check if attendance already exists (allow updates)
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();

    // Mark attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendances')
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        status: 'present',
        checked_at: new Date().toISOString(),
        qr_code: qrCode,
      }, {
        onConflict: 'user_id,session_id'
      })
      .select()
      .single();

    if (attendanceError) {
      console.error('Attendance recording error:', attendanceError);
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
    }

    console.log('✅ Attendance successfully recorded:', attendance);

    // Clean up expired QR codes (older than current time)
    await supabase
      .from('qr_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({ 
      success: true, 
      message: existingAttendance ? 'Attendance updated successfully' : 'Attendance recorded successfully',
      attendance: attendance,
      seminarTitle: session.seminars[0]?.title,
      materialsUrl: session.external_url 
    });

  } catch (error) {
    console.error('Error in PUT attendance/qr:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 