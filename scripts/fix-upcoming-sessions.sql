-- Fix upcoming sessions by updating dates to be in the future
-- Current server time: 2025-07-25, but sessions are from 2024-2025

-- Update all sessions to start from August 2025 onwards
UPDATE sessions 
SET date = date + INTERVAL '8 months'
WHERE date < NOW();

-- Verify the update
SELECT 
    'UPDATED SESSIONS' as info,
    COUNT(*) as total_updated,
    MIN(date) as new_earliest,
    MAX(date) as new_latest
FROM sessions
WHERE date >= NOW();

-- Check upcoming sessions for your user again
SELECT 
    'UPCOMING FOR USER NOW' as info,
    COUNT(*) as upcoming_count
FROM sessions s
JOIN enrollments e ON s.seminar_id = e.seminar_id
WHERE e.user_id = '7c65a851-9653-473b-b98c-c96b8569e998'
  AND e.status = 'approved'
  AND s.date >= NOW(); 