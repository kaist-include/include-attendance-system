import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - List all semesters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userRecord?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all semesters
    const { data: semesters, error } = await supabase
      .from('semesters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching semesters:', error);
      return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 });
    }

    return NextResponse.json(semesters || []);

  } catch (error) {
    console.error('Error in semesters GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch semesters' },
      { status: 500 }
    );
  }
}

// POST - Create new semester
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userRecord?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const { name, start_date, end_date, is_active } = await request.json();

    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Name, start_date, and end_date are required' },
        { status: 400 }
      );
    }

    // If setting as active, deactivate all other semesters first
    if (is_active) {
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows
    }

    // Create new semester
    const { data: semester, error } = await supabase
      .from('semesters')
      .insert({
        name,
        start_date,
        end_date,
        is_active: !!is_active
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating semester:', error);
      return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 });
    }

    return NextResponse.json(semester, { status: 201 });

  } catch (error) {
    console.error('Error in semesters POST:', error);
    return NextResponse.json(
      { error: 'Failed to create semester' },
      { status: 500 }
    );
  }
} 