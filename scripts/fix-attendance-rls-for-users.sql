-- Fix Attendance RLS Policies for QR Code Self-Check-In
-- This script adds a missing policy to allow users to create their own attendance records

-- Allow users to insert their own attendance records
CREATE POLICY "Users can create their own attendance via QR code" ON public.attendances
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      -- User must be enrolled in the seminar
      SELECT 1 FROM public.enrollments e
      JOIN public.sessions s ON s.seminar_id = e.seminar_id
      WHERE e.user_id = auth.uid() 
      AND e.status = 'approved'
      AND s.id = attendances.session_id
    )
  );

-- Allow users to update their own attendance records (for re-scanning QR codes)
CREATE POLICY "Users can update their own attendance via QR code" ON public.attendances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      -- User must be enrolled in the seminar
      SELECT 1 FROM public.enrollments e
      JOIN public.sessions s ON s.seminar_id = e.seminar_id
      WHERE e.user_id = auth.uid() 
      AND e.status = 'approved'
      AND s.id = attendances.session_id
    )
  );

-- Verify the policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  'User attendance policy created' as status
FROM pg_policies 
WHERE tablename = 'attendances'
AND schemaname = 'public'
AND policyname LIKE '%Users can%attendance%'
ORDER BY policyname;

-- Check all current attendance policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  'Current policy' as status
FROM pg_policies 
WHERE tablename = 'attendances'
AND schemaname = 'public'
ORDER BY policyname; 