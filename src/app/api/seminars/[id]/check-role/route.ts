import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;
    
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }

    // Check if seminar exists
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, owner_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check user role
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';
    const isManager = isOwner || isAdmin;

    return NextResponse.json({ 
      isManager,
      isOwner,
      isAdmin,
      userRole: userRecord?.role || 'member'
    });

  } catch (error) {
    console.error('Error in check-role API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 