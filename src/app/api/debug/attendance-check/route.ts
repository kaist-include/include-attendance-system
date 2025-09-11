import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { seminarId, sessionId, qrCode, numericCode } = await request.json();

    const debugInfo = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      seminarId,
      sessionId,
      qrCode: qrCode ? 'provided' : 'not provided',
      numericCode: numericCode ? 'provided' : 'not provided',
      checks: {} as Record<string, any>
    };

    // Check 1: Session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        seminar_id,
        title,
        date,
        seminars!inner (
          id,
          title,
          owner_id
        )
      `)
      .eq('id', sessionId)
      .eq('seminar_id', seminarId)
      .single();

    debugInfo.checks.sessionExists = {
      success: !!session,
      error: sessionError?.message || null,
      sessionData: session ? {
        id: session.id,
        title: session.title,
        seminarTitle: session.seminars[0]?.title,
        date: session.date
      } : null
    };

    // Check 2: User enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, status, applied_at, approved_at')
      .eq('user_id', user.id)
      .eq('seminar_id', seminarId)
      .single();

    debugInfo.checks.userEnrollment = {
      success: !!enrollment && enrollment.status === 'approved',
      error: enrollmentError?.message || null,
      enrollmentData: enrollment || null
    };

    // Check 3: QR Code verification (if provided)
    if (qrCode) {
      const { data: storedQrCode, error: qrError } = await supabase
        .from('qr_codes')
        .select('id, qr_code, numeric_code, expires_at, created_by, created_at')
        .eq('qr_code', qrCode)
        .eq('session_id', sessionId)
        .eq('seminar_id', seminarId)
        .single();

      debugInfo.checks.qrCodeVerification = {
        success: !!storedQrCode,
        error: qrError?.message || null,
        qrCodeData: storedQrCode ? {
          id: storedQrCode.id,
          expires_at: storedQrCode.expires_at,
          is_expired: new Date() > new Date(storedQrCode.expires_at),
          created_by: storedQrCode.created_by,
          created_at: storedQrCode.created_at
        } : null
      };
    }

    // Check 4: Numeric Code verification (if provided)
    if (numericCode) {
      const { data: storedNumericCode, error: numericError } = await supabase
        .from('qr_codes')
        .select('id, qr_code, numeric_code, expires_at, created_by, created_at')
        .eq('numeric_code', numericCode)
        .eq('session_id', sessionId)
        .eq('seminar_id', seminarId)
        .single();

      debugInfo.checks.numericCodeVerification = {
        success: !!storedNumericCode,
        error: numericError?.message || null,
        numericCodeData: storedNumericCode ? {
          id: storedNumericCode.id,
          expires_at: storedNumericCode.expires_at,
          is_expired: new Date() > new Date(storedNumericCode.expires_at),
          created_by: storedNumericCode.created_by,
          created_at: storedNumericCode.created_at
        } : null
      };
    }

    // Check 5: Current attendance status
    const { data: currentAttendance, error: attendanceError } = await supabase
      .from('attendances')
      .select('id, status, checked_at, qr_code')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();

    debugInfo.checks.currentAttendance = {
      exists: !!currentAttendance,
      error: attendanceError?.message || null,
      attendanceData: currentAttendance || null
    };

    // Check 6: User role and permissions
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    debugInfo.checks.userRole = {
      success: !!userData,
      error: userError?.message || null,
      role: userData?.role || 'unknown'
    };

    // Generate recommendations
    const recommendations = [];

    if (!debugInfo.checks.sessionExists.success) {
      recommendations.push('Session not found - check if session ID and seminar ID are correct');
    }

    if (!debugInfo.checks.userEnrollment.success) {
      if (!enrollment) {
        recommendations.push('User is not enrolled in this seminar');
      } else if (enrollment.status !== 'approved') {
        recommendations.push(`User enrollment status is "${enrollment.status}" - needs to be "approved"`);
      }
    }

    if (qrCode && !debugInfo.checks.qrCodeVerification.success) {
      recommendations.push('QR code not found or invalid for this session');
    }

    if (numericCode && !debugInfo.checks.numericCodeVerification.success) {
      recommendations.push('Numeric code not found or invalid for this session');
    }

    if (qrCode && debugInfo.checks.qrCodeVerification.qrCodeData?.is_expired) {
      recommendations.push('QR code has expired');
    }

    if (numericCode && debugInfo.checks.numericCodeVerification.numericCodeData?.is_expired) {
      recommendations.push('Numeric code has expired');
    }

    if (debugInfo.checks.currentAttendance.exists) {
      recommendations.push(`User already has attendance marked as "${currentAttendance?.status}"`);
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendations,
      overallStatus: {
        canMarkAttendance: (
          debugInfo.checks.sessionExists.success &&
          debugInfo.checks.userEnrollment.success &&
          ((qrCode && debugInfo.checks.qrCodeVerification.success && !debugInfo.checks.qrCodeVerification.qrCodeData?.is_expired) ||
           (numericCode && debugInfo.checks.numericCodeVerification.success && !debugInfo.checks.numericCodeVerification.numericCodeData?.is_expired))
        )
      }
    });

  } catch (error) {
    console.error('Attendance debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        errorType: 'debug_failure'
      }
    }, { status: 500 });
  }
} 