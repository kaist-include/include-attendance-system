-- Add External URL Fields to Seminars and Sessions
-- Run this SQL in your Supabase SQL Editor to add optional external URL fields

BEGIN;

-- Add external_url field to seminars table
ALTER TABLE seminars 
ADD COLUMN external_url TEXT;

-- Rename materials_url to external_url in sessions table for consistency
ALTER TABLE sessions 
RENAME COLUMN materials_url TO external_url;

-- Add comments for documentation
COMMENT ON COLUMN seminars.external_url IS 'Optional external URL for additional resources or information';
COMMENT ON COLUMN sessions.external_url IS 'Optional external URL for session-specific resources or materials';

COMMIT; 