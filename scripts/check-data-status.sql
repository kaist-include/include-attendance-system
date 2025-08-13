-- Comprehensive diagnostic script - all results in one view
-- Run this in Supabase SQL Editor

SELECT 
    check_type,
    result,
    details,
    count_value
FROM (
    SELECT 
        'USER CHECK' as check_type,
        CASE WHEN EXISTS (SELECT 1 FROM users WHERE id = '7c65a851-9653-473b-b98c-c96b8569e998') 
             THEN 'User exists ✅' 
             ELSE 'User missing ❌' 
        END as result,
        NULL as details,
        NULL as count_value,
        1 as sort_order

    UNION ALL

    SELECT 
        'SEMINARS COUNT' as check_type,
        COUNT(*)::text || ' seminars found' as result,
        string_agg(title, ', ') as details,
        COUNT(*) as count_value,
        2 as sort_order
    FROM seminars

    UNION ALL

    SELECT 
        'SEMINAR STATUSES' as check_type,
        'Status distribution' as result,
        string_agg(status::text, ', ') as details,
        NULL as count_value,
        3 as sort_order
    FROM seminars

    UNION ALL

    SELECT 
        'USER ENROLLMENTS' as check_type,
        CASE WHEN COUNT(*) = 0 THEN 'No enrollments ❌' 
             ELSE COUNT(*)::text || ' enrollments found ✅' 
        END as result,
        COALESCE(string_agg(e.status::text, ', '), 'none') as details,
        COUNT(*) as count_value,
        4 as sort_order
    FROM enrollments e
    JOIN seminars s ON e.seminar_id = s.id
    WHERE e.user_id = '7c65a851-9653-473b-b98c-c96b8569e998'

    UNION ALL

    SELECT 
        'ALL SESSIONS' as check_type,
        COUNT(*)::text || ' sessions total' as result,
        CASE WHEN COUNT(*) > 0 
             THEN 'From ' || MIN(date)::date::text || ' to ' || MAX(date)::date::text 
             ELSE 'No sessions found'
        END as details,
        COUNT(*) as count_value,
        5 as sort_order
    FROM sessions

    UNION ALL

    SELECT 
        'UPCOMING FOR USER' as check_type,
        CASE WHEN COUNT(*) = 0 THEN 'No upcoming sessions ❌' 
             ELSE COUNT(*)::text || ' upcoming sessions ✅' 
        END as result,
        'Sessions after ' || NOW()::date::text as details,
        COUNT(*) as count_value,
        6 as sort_order
    FROM sessions s
    JOIN enrollments e ON s.seminar_id = e.seminar_id
    WHERE e.user_id = '7c65a851-9653-473b-b98c-c96b8569e998'
      AND e.status = 'approved'
      AND s.date >= NOW()

    UNION ALL

    SELECT 
        'CURRENT TIME' as check_type,
        NOW()::text as result,
        'Server timestamp reference' as details,
        NULL as count_value,
        7 as sort_order
) AS diagnostic_results
ORDER BY sort_order; 