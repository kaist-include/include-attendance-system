-- Debug time comparison - all results in one view
-- Run this in Supabase SQL Editor

SELECT 
    info_type,
    details,
    timestamp_value,
    extra_info
FROM (
    -- 1. PostgreSQL current time
    SELECT 
        'POSTGRESQL NOW()' as info_type,
        'Server database time' as details,
        NOW() as timestamp_value,
        NULL as extra_info,
        1 as sort_order

    UNION ALL

    -- 2. JavaScript equivalent time
    SELECT 
        'JS EQUIVALENT' as info_type,
        'What JavaScript sends (UTC)' as details,
        NOW() AT TIME ZONE 'UTC' as timestamp_value,
        NULL as extra_info,
        2 as sort_order

    UNION ALL

    -- 3. Count comparison
    SELECT 
        'UPCOMING COUNTS' as info_type,
        'PostgreSQL vs JavaScript methods' as details,
        NULL as timestamp_value,
        'PG: ' || (SELECT COUNT(*) FROM sessions s 
                   JOIN enrollments e ON s.seminar_id = e.seminar_id
                   WHERE e.user_id = '7c65a851-9653-473b-b98c-c96b8569e998'
                     AND e.status = 'approved' 
                     AND s.date >= NOW())::text ||
        ' | JS: ' || (SELECT COUNT(*) FROM sessions s 
                      JOIN enrollments e ON s.seminar_id = e.seminar_id
                      WHERE e.user_id = '7c65a851-9653-473b-b98c-c96b8569e998'
                        AND e.status = 'approved' 
                        AND s.date >= (NOW() AT TIME ZONE 'UTC'))::text as extra_info,
        3 as sort_order

    UNION ALL

    -- 4. Sample session data (showing enrollment status)
    SELECT 
        'SESSION SAMPLE' as info_type,
        'First few sessions with enrollment check' as details,
        NULL as timestamp_value,
        'Total Sessions: ' || (SELECT COUNT(*) FROM sessions)::text ||
        ' | Your Enrollments: ' || (SELECT COUNT(*) FROM enrollments WHERE user_id = '7c65a851-9653-473b-b98c-c96b8569e998' AND status = 'approved')::text as extra_info,
        4 as sort_order
) AS debug_results
ORDER BY sort_order, timestamp_value; 