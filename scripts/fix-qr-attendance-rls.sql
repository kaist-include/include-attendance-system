-- Fix RLS policy to allow students to mark their own attendance via QR code
-- This allows enrolled students to insert their own attendance records

-- Add policy for students to mark their own attendance when enrolled
CREATE POLICY "Users can mark their own attendance when enrolled" ON attendances 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM enrollments 
    JOIN sessions ON sessions.seminar_id = enrollments.seminar_id
    WHERE enrollments.user_id = auth.uid() 
    AND sessions.id = attendances.session_id 
    AND enrollments.status = 'approved'
  )
);

-- Also allow users to update their own attendance (in case they scan twice)
CREATE POLICY "Users can update their own attendance when enrolled" ON attendances 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM enrollments 
    JOIN sessions ON sessions.seminar_id = enrollments.seminar_id
    WHERE enrollments.user_id = auth.uid() 
    AND sessions.id = attendances.session_id 
    AND enrollments.status = 'approved'
  )
)
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM enrollments 
    JOIN sessions ON sessions.seminar_id = enrollments.seminar_id
    WHERE enrollments.user_id = auth.uid() 
    AND sessions.id = attendances.session_id 
    AND enrollments.status = 'approved'
  )
); 