-- Fix Admin DELETE Permissions for Seminar Deletion
-- This script adds RLS policies to allow admin users to delete records from all related tables

-- 1. Add admin DELETE policy for seminars table
CREATE POLICY "Admin can delete any seminar" ON public.seminars
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 2. Add admin DELETE policy for sessions table  
CREATE POLICY "Admin can delete any session" ON public.sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Add admin DELETE policy for enrollments table
CREATE POLICY "Admin can delete any enrollment" ON public.enrollments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 4. Add admin DELETE policy for attendances table
CREATE POLICY "Admin can delete any attendance" ON public.attendances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Verify the policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  'Admin DELETE policy created' as status
FROM pg_policies 
WHERE tablename IN ('seminars', 'sessions', 'enrollments', 'attendances')
AND schemaname = 'public'
AND policyname LIKE '%Admin can delete%'
ORDER BY tablename;

-- 6. Optional: Check all current DELETE policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual as delete_condition
FROM pg_policies 
WHERE tablename IN ('seminars', 'sessions', 'enrollments', 'attendances')
AND schemaname = 'public'
AND cmd IN ('DELETE', 'ALL')
ORDER BY tablename, policyname; 