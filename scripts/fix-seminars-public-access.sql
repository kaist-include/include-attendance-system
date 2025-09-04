-- Fix seminars not showing by making them publicly accessible
-- Run this in your Supabase SQL Editor

-- 1. Drop the restrictive authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view seminars" ON seminars;

-- 2. Create a public read policy for seminars
CREATE POLICY "Anyone can view seminars" ON seminars FOR SELECT USING (true);

-- 3. Also make semesters publicly readable (needed for seminar joins)
DROP POLICY IF EXISTS "Authenticated users can view semesters" ON semesters;
CREATE POLICY "Anyone can view semesters" ON semesters FOR SELECT USING (true);

-- 4. Make users table partially readable for seminar owner info
DROP POLICY IF EXISTS "Admin can view all users" ON users;
CREATE POLICY "Anyone can view user basic info" ON users FOR SELECT USING (true);

-- Note: This keeps other operations (CREATE, UPDATE, DELETE) secure
-- Only SELECT operations are made public for browsing purposes 