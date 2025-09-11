import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// PATCH - Update semester (mainly for setting active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const updates = await request.json();

    // If setting as active, deactivate all other semesters first
    if (updates.is_active === true) {
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .neq('id', id);
    }

    // Update semester
    const { data: semester, error } = await supabase
      .from('semesters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating semester:', error);
      return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 });
    }

    return NextResponse.json(semester);

  } catch (error) {
    console.error('Error in semester PATCH:', error);
    return NextResponse.json(
      { error: 'Failed to update semester' },
      { status: 500 }
    );
  }
}

// DELETE - Delete semester
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if semester has associated seminars
    const { count: seminarCount } = await supabase
      .from('seminars')
      .select('*', { count: 'exact', head: true })
      .eq('semester_id', id);

    if (seminarCount && seminarCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete semester with associated seminars' },
        { status: 400 }
      );
    }

    // Delete semester
    const { error } = await supabase
      .from('semesters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting semester:', error);
      return NextResponse.json({ error: 'Failed to delete semester' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Semester deleted successfully' });

  } catch (error) {
    console.error('Error in semester DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete semester' },
      { status: 500 }
    );
  }
} 