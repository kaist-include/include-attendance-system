-- Update RLS policy to allow seminar_leader role to manage semesters
-- Run this in your Supabase SQL Editor

-- Drop the existing policy
DROP POLICY IF EXISTS "Admin can manage semesters" ON semesters;

-- Create the updated policy that allows both admin and seminar_leader roles
CREATE POLICY "Admin and seminar leaders can manage semesters" ON semesters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'seminar_leader')
  )
); 