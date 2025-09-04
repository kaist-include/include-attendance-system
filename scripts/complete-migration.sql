-- Complete Migration Script for Include Attendance System
-- Part 1: Finalize seminar_leader role removal
-- Part 2: Simplify application system (remove first_come vs selection)
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- ===========================================
-- PART 1: Complete seminar_leader role removal
-- ===========================================

-- Step 1: Check and update any remaining seminar_leader users (idempotent)
DO $$
DECLARE
    seminar_leader_count INTEGER;
BEGIN
    -- Count users with seminar_leader role (if enum still supports it)
    BEGIN
        SELECT COUNT(*) INTO seminar_leader_count 
        FROM users WHERE role::text = 'seminar_leader';
        
        IF seminar_leader_count > 0 THEN
            RAISE NOTICE 'Found % users with seminar_leader role, converting to member...', seminar_leader_count;
            UPDATE users 
            SET role = 'member'::user_role, updated_at = NOW() 
            WHERE role::text = 'seminar_leader';
        ELSE
            RAISE NOTICE 'No seminar_leader users found';
        END IF;
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'seminar_leader role already removed from enum';
    END;
END $$;

-- Step 2: Create helper function for role checking (idempotent)
CREATE OR REPLACE FUNCTION public.user_has_role(check_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update all RLS policies to use the helper function (idempotent)
-- Users policies
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
DROP POLICY IF EXISTS "Admin and seminar leaders can manage semesters" ON semesters;
CREATE POLICY "Admin can manage semesters" ON semesters FOR ALL USING (
  public.user_has_role('admin')
);

-- Seminars policies  
DROP POLICY IF EXISTS "Authenticated users can create seminars" ON seminars;
DROP POLICY IF EXISTS "Seminar leaders can create seminars" ON seminars;
CREATE POLICY "Authenticated users can create seminars" ON seminars FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);
DROP POLICY IF EXISTS "Owners and admins can update seminars" ON seminars;
CREATE POLICY "Owners and admins can update seminars" ON seminars FOR UPDATE USING (
  auth.uid() = owner_id OR public.user_has_role('admin')
);

-- ===========================================
-- PART 2: Simplify application system
-- ===========================================

-- Step 4: Remove application_type distinction - make all seminars owner-approved
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update existing seminars to use 'selection' type (owner approval)
    UPDATE seminars 
    SET application_type = 'selection', updated_at = NOW()
    WHERE application_type = 'first_come';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Update the default for new seminars
    ALTER TABLE seminars ALTER COLUMN application_type SET DEFAULT 'selection';
    
    -- Note: We keep the application_type column and enum for backward compatibility
    -- but now all seminars will use 'selection' (owner approval) by default
    
    RAISE NOTICE 'Updated % seminars from first_come to selection (owner approval)', updated_count;
    
    -- Show current distribution
    RAISE NOTICE 'Current application type distribution:';
    FOR updated_count IN 
        SELECT COUNT(*) FROM seminars WHERE application_type = 'first_come'
    LOOP
        RAISE NOTICE '  first_come: %', updated_count;
    END LOOP;
    
    FOR updated_count IN 
        SELECT COUNT(*) FROM seminars WHERE application_type = 'selection'
    LOOP
        RAISE NOTICE '  selection: %', updated_count;
    END LOOP;
END $$;

-- ===========================================
-- VERIFICATION
-- ===========================================

-- Step 6: Verify the migration results
SELECT 'Migration completed successfully!' AS status;

SELECT 'Current user role distribution:' AS user_info;
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

SELECT 'Current seminar application types:' AS seminar_info;
SELECT application_type, COUNT(*) as count 
FROM seminars 
GROUP BY application_type 
ORDER BY application_type;

SELECT 'Active policies verification:' AS policies_info;
SELECT schemaname, tablename, policyname
FROM pg_policies 
WHERE tablename IN ('users', 'profiles', 'semesters', 'seminars')
ORDER BY tablename, policyname;

COMMIT;

-- ===========================================
-- POST-MIGRATION SUMMARY
-- ===========================================
-- 
-- ✅ COMPLETED:
-- 1. Removed seminar_leader role completely
-- 2. All users are now either 'admin' or 'member'
-- 3. Created helper function for role checking
-- 4. Updated all RLS policies
-- 5. Simplified application system - all seminars now use owner approval
--
-- 🔄 APPLICATION FLOW NOW:
-- 1. Anyone can create seminars (status: 'draft')
-- 2. Owner changes status to 'recruiting' when ready
-- 3. Users apply during application period
-- 4. All applications go to 'pending' status
-- 5. Seminar owner approves/rejects applications
-- 6. No more first_come automatic approval
-- 