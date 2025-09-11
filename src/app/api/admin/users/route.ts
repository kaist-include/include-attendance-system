import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendUserRoleChangedNotification } from '@/lib/notifications';

// GET - Fetch users with pagination, roles and enrollment counts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userRecord?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting users:', countError);
      return NextResponse.json({ error: 'Failed to count users' }, { status: 500 });
    }

    // Fetch users with pagination
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        created_at,
        updated_at,
        profiles (
          nickname,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get enrollment counts for each user
    const userIds = users?.map(u => u.id) || [];
    const { data: enrollmentCounts, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('user_id, status')
      .in('user_id', userIds);

    if (enrollmentError) {
      console.error('Error fetching enrollment counts:', enrollmentError);
      return NextResponse.json({ error: 'Failed to fetch enrollment data' }, { status: 500 });
    }

    // Process enrollment data by user
    const enrollmentsByUser = enrollmentCounts?.reduce((acc, enrollment) => {
      if (!acc[enrollment.user_id]) {
        acc[enrollment.user_id] = {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0
        };
      }
      acc[enrollment.user_id].total++;
      
      // Ensure status is one of the valid keys
      const status = enrollment.status as 'approved' | 'pending' | 'rejected';
      if (status in acc[enrollment.user_id]) {
        acc[enrollment.user_id][status]++;
      }
      
      return acc;
    }, {} as Record<string, { total: number; approved: number; pending: number; rejected: number }>) || {};

    // Combine user data with enrollment counts
    const usersWithStats = users?.map(user => {
      // Handle profiles - it could be an array or single object
      const profile = Array.isArray(user.profiles) 
        ? user.profiles[0] 
        : user.profiles;
      
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        nickname: profile?.nickname || null,
        created_at: user.created_at,
        profile_created_at: profile?.created_at || null,
        enrollments: enrollmentsByUser[user.id] || {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0
        }
      };
    }) || [];

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount || 0,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error in users GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user role
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userRecord?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or member' }, { status: 400 });
    }

    // Prevent admin from changing their own role
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Update user role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    // Send notification to user about role change
    try {
      await sendUserRoleChangedNotification(userId, role);
    } catch (notificationError) {
      console.error('Failed to send role change notification:', notificationError);
      // Don't fail the role update if notification fails
    }

    return NextResponse.json({ 
      message: 'User role updated successfully',
      user: updatedUser 
    });

  } catch (error) {
    console.error('Error in users PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 