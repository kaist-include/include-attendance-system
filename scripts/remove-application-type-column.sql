-- Remove application_type column from seminars table
-- This script removes the deprecated application_type column that is no longer used in the application

-- First, remove any constraints or indexes that might reference this column
ALTER TABLE public.seminars DROP CONSTRAINT IF EXISTS seminars_application_type_check;
DROP INDEX IF EXISTS idx_seminars_application_type;

-- Remove the application_type column
ALTER TABLE public.seminars DROP COLUMN IF EXISTS application_type;

-- Verify the column has been removed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'seminars' 
    AND column_name = 'application_type'
  ) THEN
    RAISE NOTICE 'application_type column has been successfully removed from seminars table';
  ELSE
    RAISE EXCEPTION 'Failed to remove application_type column from seminars table';
  END IF;
END $$; 