-- Add Missing DELETE Policies for Seminar Deletion
-- Based on current RLS policy patterns in Supabase

-- 1. Add DELETE policy for seminars table
-- Pattern: "Owners and admins can update seminars" -> extend to DELETE
CREATE POLICY "Owners and admins can delete seminars" ON public.seminars
  FOR DELETE
  USING (
    -- Owner can delete their own seminar
    owner_id = auth.uid() 
    OR 
    -- Admin can delete any seminar
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 2. Add DELETE policy for enrollments table  
-- Pattern: "Seminar owners and admins can update enrollments" -> extend to DELETE
CREATE POLICY "Seminar owners and admins can delete enrollments" ON public.enrollments
  FOR DELETE
  USING (
    -- Seminar owner can delete enrollments for their seminar
    EXISTS (
      SELECT 1 FROM public.seminars 
      WHERE seminars.id = enrollments.seminar_id 
      AND seminars.owner_id = auth.uid()
    )
    OR 
    -- Admin can delete any enrollment
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Verify the new policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  'New DELETE policy added' as status
FROM pg_policies 
WHERE tablename IN ('seminars', 'enrollments')
AND schemaname = 'public'
AND cmd = 'DELETE'
ORDER BY tablename;

-- 4. Show complete policy overview for affected tables
SELECT 
  tablename,
  policyname,
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN '👀 View'
    WHEN 'INSERT' THEN '➕ Create' 
    WHEN 'UPDATE' THEN '✏️ Edit'
    WHEN 'DELETE' THEN '🗑️ Delete'
    WHEN 'ALL' THEN '🔓 All Operations'
    ELSE cmd
  END as operation
FROM pg_policies 
WHERE tablename IN ('seminars', 'enrollments')
AND schemaname = 'public'
ORDER BY tablename, cmd; 