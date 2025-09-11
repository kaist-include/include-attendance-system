import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    console.log('[Health Check] Starting Supabase activity check...');
    
    const supabase = await createClient();
    
    // Perform a simple query to keep the database active
    // Query the users table to check connection
    const { data, error, count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[Health Check] Database query failed:', error.message);
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      );
    }

    console.log(`[Health Check] Success - Found ${count || 0} users in database`);
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Supabase connection active',
      userCount: count || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Health Check] Unexpected error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
} 