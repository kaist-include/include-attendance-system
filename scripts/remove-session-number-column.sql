-- Migration: Remove session_number column from sessions table
-- This makes session ordering dynamic based on date instead of storing it in DB

BEGIN;

-- Step 1: Drop the unique constraint that includes session_number
-- Check if the constraint exists first
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'sessions_seminar_id_session_number_key' 
        AND table_name = 'sessions'
    ) THEN
        ALTER TABLE sessions DROP CONSTRAINT sessions_seminar_id_session_number_key;
        RAISE NOTICE 'Dropped unique constraint sessions_seminar_id_session_number_key';
    ELSE
        RAISE NOTICE 'Unique constraint sessions_seminar_id_session_number_key does not exist';
    END IF;
END $$;

-- Step 2: Drop the session_number column
-- Check if the column exists first
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'session_number'
    ) THEN
        ALTER TABLE sessions DROP COLUMN session_number;
        RAISE NOTICE 'Dropped session_number column from sessions table';
    ELSE
        RAISE NOTICE 'Column session_number does not exist in sessions table';
    END IF;
END $$;

-- Step 3: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

COMMIT;

-- Note: After running this migration, session numbers will be calculated dynamically
-- based on date ordering in the application code. Sessions will be ordered by:
-- ORDER BY date ASC
-- And session numbers will be (index + 1) in the result array. 