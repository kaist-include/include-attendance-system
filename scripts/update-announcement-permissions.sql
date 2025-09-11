-- Update Announcement Permissions for Global Announcements
-- Run this SQL in your Supabase SQL Editor to ensure proper permissions for global announcements

BEGIN;

-- Drop all existing announcement policies first
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON announcements;
DROP POLICY IF EXISTS "Seminar owners and admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage global announcements" ON announcements;
DROP POLICY IF EXISTS "Seminar owners and admins can manage seminar announcements" ON announcements;

-- Create new policies for better clarity
CREATE POLICY "Authenticated users can view announcements" ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage global announcements" ON announcements FOR ALL USING (
  seminar_id IS NULL AND is_global = true AND 
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Seminar owners and admins can manage seminar announcements" ON announcements FOR ALL USING (
  seminar_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM seminars WHERE seminars.id = announcements.seminar_id AND 
      (seminars.owner_id = auth.uid() OR 
       EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
    )
  )
);

-- Ensure global announcements have proper constraints
-- Drop existing constraint if it exists and add the check constraint
ALTER TABLE announcements 
DROP CONSTRAINT IF EXISTS global_announcements_check;

ALTER TABLE announcements 
ADD CONSTRAINT global_announcements_check 
CHECK ((is_global = true AND seminar_id IS NULL) OR (is_global = false));

COMMIT; 