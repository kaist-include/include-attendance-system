-- Debug RLS Policies for Seminar Deletion Issues
-- This script helps diagnose RLS policy issues that might prevent seminar deletion

-- 1. Check current RLS policies on all relevant tables
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  -- Check if RLS is enabled
  CASE 
    WHEN rowsecurity = true THEN 'RLS ENABLED' 
    ELSE 'RLS DISABLED' 
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('seminars', 'sessions', 'enrollments', 'attendances')
AND schemaname = 'public';

-- 2. List all policies on these tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('seminars', 'sessions', 'enrollments', 'attendances')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check if there are any DELETE policies that might be blocking deletion
SELECT 
  tablename,
  policyname,
  cmd,
  qual as delete_condition,
  'This policy controls DELETE operations' as note
FROM pg_policies 
WHERE tablename IN ('seminars', 'sessions', 'enrollments', 'attendances')
AND schemaname = 'public'
AND cmd IN ('DELETE', 'ALL')
ORDER BY tablename;

-- 4. Temporary solution: Create a debug function to test deletion with elevated privileges
-- WARNING: Only use this for debugging in development environment!
CREATE OR REPLACE FUNCTION debug_delete_seminar(seminar_uuid uuid)
RETURNS TABLE(step text, action text, count bigint, success boolean) 
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the function creator's privileges
AS $$
DECLARE
  session_ids uuid[];
  deleted_count bigint;
BEGIN
  -- Step 1: Get session IDs
  SELECT array_agg(id) INTO session_ids
  FROM public.sessions 
  WHERE seminar_id = seminar_uuid;
  
  RETURN QUERY SELECT 'Step 1'::text, 'Found sessions'::text, 
                     COALESCE(array_length(session_ids, 1), 0)::bigint, 
                     true;

  -- Step 2: Delete attendance records
  IF session_ids IS NOT NULL AND array_length(session_ids, 1) > 0 THEN
    DELETE FROM public.attendances 
    WHERE session_id = ANY(session_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'Step 2'::text, 'Deleted attendances'::text, 
                       deleted_count, true;
  ELSE
    RETURN QUERY SELECT 'Step 2'::text, 'No sessions found - skipped attendances'::text, 
                       0::bigint, true;
  END IF;

  -- Step 3: Delete sessions
  DELETE FROM public.sessions 
  WHERE seminar_id = seminar_uuid;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT 'Step 3'::text, 'Deleted sessions'::text, 
                     deleted_count, true;

  -- Step 4: Delete enrollments
  DELETE FROM public.enrollments 
  WHERE seminar_id = seminar_uuid;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT 'Step 4'::text, 'Deleted enrollments'::text, 
                     deleted_count, true;

  -- Step 5: Delete seminar
  DELETE FROM public.seminars 
  WHERE id = seminar_uuid;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT 'Step 5'::text, 'Deleted seminar'::text, 
                     deleted_count, 
                     CASE WHEN deleted_count > 0 THEN true ELSE false END;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 'Error'::text, SQLERRM::text, 0::bigint, false;
END;
$$;

-- 5. Usage example (replace 'your-seminar-id' with actual UUID):
-- SELECT * FROM debug_delete_seminar('your-seminar-id');

-- 6. Temporary RLS disable for debugging (USE WITH CAUTION!)
-- Uncomment these lines ONLY in development environment:

-- ALTER TABLE public.seminars DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.attendances DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS after testing:
-- ALTER TABLE public.seminars ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY; 