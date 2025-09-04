-- Comprehensive Supabase Migration: Remove seminar_leader role
-- Run this SQL in your Supabase SQL Editor to update the database schema
-- WARNING: This will change the database schema and update existing data

BEGIN;

-- Step 1: Check if migration is needed and update users if seminar_leader still exists
DO $$
DECLARE
    seminar_leader_exists BOOLEAN;
BEGIN
    -- Check if seminar_leader value exists in current enum
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'seminar_leader'
    ) INTO seminar_leader_exists;
    
    IF seminar_leader_exists THEN
        RAISE NOTICE 'Found seminar_leader role in enum, proceeding with migration...';
        
        -- Update existing users with seminar_leader role to member role
        UPDATE users 
        SET role = 'member', updated_at = NOW() 
        WHERE role = 'seminar_leader';
        
        -- Display updated users
        RAISE NOTICE 'Updated % users from seminar_leader to member', 
            (SELECT COUNT(*) FROM users WHERE role = 'member');
    ELSE
        RAISE NOTICE 'seminar_leader role already migrated, skipping user updates...';
    END IF;
END $$;

-- Step 2: Drop ALL RLS policies that reference user roles (needed for enum migration)
-- We'll recreate them after the enum change

-- Drop policies on users table
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Drop policies on profiles table  
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

-- Drop policies on semesters table
DROP POLICY IF EXISTS "Admin and seminar leaders can manage semesters" ON semesters;
DROP POLICY IF EXISTS "Admin can manage semesters" ON semesters;

-- Drop policies on seminars table
DROP POLICY IF EXISTS "Seminar leaders can create seminars" ON seminars;
DROP POLICY IF EXISTS "Owners and admins can update seminars" ON seminars;

-- Drop policies on sessions table
DROP POLICY IF EXISTS "Seminar owners and admins can manage sessions" ON sessions;

-- Drop policies on enrollments table
DROP POLICY IF EXISTS "Seminar owners and admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Seminar owners and admins can update enrollments" ON enrollments;

-- Drop policies on attendances table
DROP POLICY IF EXISTS "Seminar owners and admins can manage attendances" ON attendances;

-- Drop policies on announcements table  
DROP POLICY IF EXISTS "Seminar owners and admins can manage announcements" ON announcements;

-- Step 3: Check if enum migration is needed
DO $$
DECLARE
    seminar_leader_exists BOOLEAN;
BEGIN
    -- Check if seminar_leader value exists in current enum
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'seminar_leader'
    ) INTO seminar_leader_exists;
    
    IF seminar_leader_exists THEN
        RAISE NOTICE 'Migrating user_role enum to remove seminar_leader...';
        
        -- Remove the default constraint temporarily
        ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
        
        -- Create new enum type without seminar_leader
        ALTER TYPE user_role RENAME TO user_role_old;
        CREATE TYPE user_role AS ENUM ('admin', 'member');
        
        -- Update the users table to use the new enum
        ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
        
        -- Restore the default constraint with new enum
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'::user_role;
        
        -- Drop the old enum type
        DROP TYPE user_role_old;
        
        RAISE NOTICE 'Enum migration completed successfully';
    ELSE
        RAISE NOTICE 'user_role enum already migrated, skipping enum update...';
    END IF;
END $$;

-- Step 4: Create a helper function to check user roles (security definer to bypass RLS)
-- Using CREATE OR REPLACE so it's safe to run multiple times
-- Note: Using public schema instead of auth schema due to permission restrictions
CREATE OR REPLACE FUNCTION public.user_has_role(check_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Recreate all RLS policies (using the helper function)
-- All policies use CREATE OR REPLACE to be safe for multiple runs

-- Note: We use DROP IF EXISTS + CREATE instead of CREATE OR REPLACE for policies
-- since PostgreSQL doesn't support CREATE OR REPLACE POLICY

-- Users policies (using helper function to avoid recursion)
DROP POLICY IF EXISTS "Admin can view all users" ON users;
CREATE POLICY "Admin can view all users" ON users FOR SELECT USING (
  public.user_has_role('admin')
);

-- Profiles policies  
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (
  public.user_has_role('admin')
);

-- Semesters policies
DROP POLICY IF EXISTS "Admin can manage semesters" ON semesters;
CREATE POLICY "Admin can manage semesters" ON semesters FOR ALL USING (
  public.user_has_role('admin')
);

-- Seminars policies  
DROP POLICY IF EXISTS "Authenticated users can create seminars" ON seminars;
CREATE POLICY "Authenticated users can create seminars" ON seminars FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);
DROP POLICY IF EXISTS "Owners and admins can update seminars" ON seminars;
CREATE POLICY "Owners and admins can update seminars" ON seminars FOR UPDATE USING (
  auth.uid() = owner_id OR public.user_has_role('admin')
);

-- Sessions policies
DROP POLICY IF EXISTS "Seminar owners and admins can manage sessions" ON sessions;
CREATE POLICY "Seminar owners and admins can manage sessions" ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = sessions.seminar_id AND 
    (seminars.owner_id = auth.uid() OR public.user_has_role('admin'))
  )
);

-- Enrollments policies
DROP POLICY IF EXISTS "Seminar owners and admins can view all enrollments" ON enrollments;
CREATE POLICY "Seminar owners and admins can view all enrollments" ON enrollments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = enrollments.seminar_id AND 
    (seminars.owner_id = auth.uid() OR public.user_has_role('admin'))
  )
);
DROP POLICY IF EXISTS "Seminar owners and admins can update enrollments" ON enrollments;
CREATE POLICY "Seminar owners and admins can update enrollments" ON enrollments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = enrollments.seminar_id AND 
    (seminars.owner_id = auth.uid() OR public.user_has_role('admin'))
  )
);

-- Attendances policies
DROP POLICY IF EXISTS "Seminar owners and admins can manage attendances" ON attendances;
CREATE POLICY "Seminar owners and admins can manage attendances" ON attendances FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sessions 
    JOIN seminars ON seminars.id = sessions.seminar_id 
    WHERE sessions.id = attendances.session_id AND 
    (seminars.owner_id = auth.uid() OR public.user_has_role('admin'))
  )
);

-- Announcements policies
DROP POLICY IF EXISTS "Seminar owners and admins can manage announcements" ON announcements;
CREATE POLICY "Seminar owners and admins can manage announcements" ON announcements FOR ALL USING (
  (seminar_id IS NULL AND public.user_has_role('admin')) OR
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = announcements.seminar_id AND 
    (seminars.owner_id = auth.uid() OR public.user_has_role('admin'))
  )
);

-- Step 6: Verify the migration results
SELECT 'Migration completed successfully!' AS status;
SELECT 'Current user role distribution:' AS info;
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

SELECT 'Current RLS policies on seminars:' AS policies_info;
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'seminars' 
ORDER BY policyname;

COMMIT;

-- Post-migration notes:
-- 1. All former seminar_leaders are now members
-- 2. Anyone can create seminars (no role restriction)
-- 3. Only seminar owners and admins can manage seminars
-- 4. Only admins can manage semesters
-- 5. Frontend code has been updated to remove seminar_leader references 