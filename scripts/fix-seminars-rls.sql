-- Option 1: Allow anonymous users to view seminars (make them publicly accessible)
-- This would allow the frontend to work without authentication for viewing seminars

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view seminars" ON seminars;

-- Create a new policy that allows anyone (including anonymous users) to view seminars
CREATE POLICY "Anyone can view seminars" ON seminars FOR SELECT USING (true);

-- Keep the existing policies for other operations
-- CREATE POLICY "Seminar leaders can create seminars" ON seminars FOR INSERT ... (already exists)
-- CREATE POLICY "Owners and admins can update seminars" ON seminars FOR UPDATE ... (already exists) 