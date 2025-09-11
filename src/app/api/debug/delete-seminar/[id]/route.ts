import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔍 DEBUG DELETE: Starting deletion for seminar:', id);

    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ DEBUG: Authentication failed:', authError);
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    console.log('✅ DEBUG: User authenticated:', user.id, user.email);

    // Check if seminar exists and get owner info
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, owner_id, status')
      .eq('id', id)
      .single();

    if (seminarError || !seminar) {
      console.log('❌ DEBUG: Seminar not found:', seminarError);
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    console.log('✅ DEBUG: Seminar found:', {
      id: seminar.id,
      title: seminar.title,
      owner_id: seminar.owner_id,
      status: seminar.status
    });

    // Check permissions
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';

    console.log('🔍 DEBUG: Permission check:', {
      userId: user.id,
      seminarOwnerId: seminar.owner_id,
      isOwner,
      userRole: userRecord?.role,
      isAdmin,
      canDelete: isOwner || isAdmin
    });

    if (!isOwner && !isAdmin) {
      console.log('❌ DEBUG: Permission denied');
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Test 1: Try to delete just the seminar (this should fail due to foreign keys)
    console.log('🧪 TEST 1: Attempting direct seminar deletion (expect failure)...');
    const { data: testDelete, error: testError } = await supabase
      .from('seminars')
      .delete()
      .eq('id', id)
      .select('id');

    console.log('🧪 TEST 1 Result:', {
      error: testError,
      deletedData: testDelete
    });

    if (testError) {
      console.log('✅ Expected: Direct deletion failed due to foreign key constraints');
    } else {
      console.log('⚠️ Unexpected: Direct deletion succeeded');
      return NextResponse.json({ 
        message: 'Debug deletion completed',
        testResult: 'Direct deletion succeeded unexpectedly',
        deletedData: testDelete
      });
    }

    // Test 2: Check what related data exists
    console.log('🧪 TEST 2: Checking related data...');
    
    const { data: sessions, count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('seminar_id', id);

    const { data: enrollments, count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact' })
      .eq('seminar_id', id);

    console.log('🧪 TEST 2 Results:', {
      sessions: { count: sessionCount, data: sessions },
      enrollments: { count: enrollmentCount, data: enrollments }
    });

    // If there are sessions, check attendance records
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: attendances, count: attendanceCount } = await supabase
        .from('attendances')
        .select('*', { count: 'exact' })
        .in('session_id', sessionIds);

      console.log('🧪 Attendance records:', {
        count: attendanceCount,
        data: attendances
      });
    }

    return NextResponse.json({ 
      message: 'Debug analysis completed - no actual deletion performed',
      seminar: {
        id: seminar.id,
        title: seminar.title,
        owner_id: seminar.owner_id
      },
      permissions: {
        isOwner,
        isAdmin,
        canDelete: isOwner || isAdmin
      },
      relatedData: {
        sessions: sessionCount || 0,
        enrollments: enrollmentCount || 0
      },
      note: 'Check server logs for detailed debugging information'
    });

  } catch (error) {
    console.error('❌ DEBUG DELETE API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 