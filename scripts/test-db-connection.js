// Test script to verify Supabase database connection
// Run with: node scripts/test-db-connection.js

require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing Supabase database connection...\n');

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  console.log('1. Checking environment variables...');
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    console.log('\nPlease ensure you have a .env.local file with all required variables.');
    return;
  }
  console.log('✅ All environment variables found\n');

  // Test Supabase connection
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    console.log('2. Testing Supabase client connection...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\nPossible issues:');
      console.log('- Database schema not created yet');
      console.log('- Wrong Supabase credentials');
      console.log('- RLS policies blocking access');
      return;
    }

    console.log('✅ Database connection successful\n');

    // Test table existence
    console.log('3. Checking required tables...');
    const requiredTables = [
      'users', 'profiles', 'semesters', 'seminars', 
      'sessions', 'enrollments', 'attendances', 
      'announcements', 'comments', 'notifications'
    ];

    for (const table of requiredTables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (tableError) {
          console.log(`❌ Table '${table}' not found or inaccessible`);
        } else {
          console.log(`✅ Table '${table}' exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ Error checking table '${table}':`, err.message);
      }
    }

    console.log('\n4. Testing authentication configuration...');
    
    // Test if auth is properly configured
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message.includes('invalid JWT')) {
      console.log('✅ Auth configuration appears correct (no session expected)');
    } else {
      console.log('✅ Auth system is accessible');
    }

    console.log('\n🎉 Database connection test completed!');
    console.log('\nNext steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Try registering a new user');
    console.log('3. Check if user appears in Supabase dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\nPlease check:');
    console.log('- Your Supabase project is active');
    console.log('- Environment variables are correct');
    console.log('- Database schema has been applied');
  }
}

// Run the test
testConnection().catch(console.error); 