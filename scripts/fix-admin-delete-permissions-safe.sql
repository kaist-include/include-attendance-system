-- Safe Fix for Admin DELETE Permissions
-- This script safely adds RLS policies for admin users with conflict prevention

-- 1. First, remove any existing admin DELETE policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Admin can delete any seminar" ON public.seminars;
DROP POLICY IF EXISTS "Admin can delete any session" ON public.sessions;  
DROP POLICY IF EXISTS "Admin can delete any enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "Admin can delete any attendance" ON public.attendances;

-- Alternative policy names that might exist
DROP POLICY IF EXISTS "Admins can delete seminars" ON public.seminars;
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can delete attendances" ON public.attendances;

-- 2. Now create the admin DELETE policies
CREATE POLICY "Admin can delete any seminar" ON public.seminars
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete any session" ON public.sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete any enrollment" ON public.enrollments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete any attendance" ON public.attendances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Verify all policies were created successfully
DO $$ 
DECLARE
  policy_count integer;
  table_name text;
  tables text[] := ARRAY['seminars', 'sessions', 'enrollments', 'attendances'];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = table_name
    AND schemaname = 'public'
    AND policyname = 'Admin can delete any ' || table_name
    AND cmd = 'DELETE';
    
    IF policy_count = 1 THEN
      RAISE NOTICE '✅ Admin DELETE policy created for table: %', table_name;
    ELSE
      RAISE NOTICE '❌ Failed to create admin DELETE policy for table: %', table_name;
    END IF;
  END LOOP;
END $$;

-- 4. Show all current DELETE policies for verification
SELECT 
  '=== Current DELETE Policies ===' as info;
  
SELECT 
  tablename,
  policyname,
  cmd,
  LEFT(qual, 80) || CASE WHEN LENGTH(qual) > 80 THEN '...' ELSE '' END as condition_preview
FROM pg_policies 
WHERE tablename IN ('seminars', 'sessions', 'enrollments', 'attendances')
AND schemaname = 'public'
AND cmd IN ('DELETE', 'ALL')
ORDER BY tablename, policyname; 