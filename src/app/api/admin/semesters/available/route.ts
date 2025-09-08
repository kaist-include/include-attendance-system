import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Get available semesters for seminar creation (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user (required for authentication)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all semesters, with active semester first
    const { data: semesters, error } = await supabase
      .from('semesters')
      .select('id, name, start_date, end_date, is_active')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching available semesters:', error);
      return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 });
    }

    // Transform to format expected by seminar creation form
    const semesterOptions = (semesters || []).map(semester => ({
      id: semester.id,
      value: semester.name,
      label: semester.name,
      isActive: semester.is_active,
      startDate: semester.start_date,
      endDate: semester.end_date
    }));

    return NextResponse.json(semesterOptions);

  } catch (error) {
    console.error('Error in available semesters GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available semesters' },
      { status: 500 }
    );
  }
} 