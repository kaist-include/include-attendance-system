// Simple script to force update all seminar dates
require('dotenv').config({ path: '.env.local' });

async function forceUpdateSeminarDates() {
  try {
    console.log('🚀 Starting force update of seminar dates...\n');

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
    }

    console.log(`🔧 Calling API at: ${apiUrl}/api/admin/recalculate-seminar-dates`);

    const response = await fetch(`${apiUrl}/api/admin/recalculate-seminar-dates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Update completed successfully!');
    console.log(`📊 Summary: ${result.summary.successCount}/${result.summary.totalSeminars} seminars updated`);
    
    if (result.summary.errorCount > 0) {
      console.log(`❌ ${result.summary.errorCount} seminars had errors`);
    }

    console.log('\n📋 Detailed Results:');
    result.results.forEach((seminar, index) => {
      const status = seminar.success ? '✅' : '❌';
      const dateInfo = seminar.success 
        ? `${seminar.startDate || 'null'} → ${seminar.endDate || 'null'} (${seminar.sessionCount} sessions)`
        : `Error: ${seminar.error}`;
      
      console.log(`${status} ${index + 1}. ${seminar.seminarTitle}: ${dateInfo}`);
    });

    console.log('\n🎉 All done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
forceUpdateSeminarDates(); 