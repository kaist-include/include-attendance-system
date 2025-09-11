-- Add Seminar Permissions Table
-- Run this SQL in your Supabase SQL Editor to add seminar-specific role management

BEGIN;

-- Create enum for seminar-specific roles
CREATE TYPE seminar_role AS ENUM ('assistant', 'moderator');

-- Create seminar_permissions table
CREATE TABLE seminar_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role seminar_role NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only have one role per seminar
    UNIQUE(seminar_id, user_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_seminar_permissions_updated_at 
    BEFORE UPDATE ON seminar_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE seminar_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seminar_permissions
-- Seminar owners and admins can manage permissions
CREATE POLICY "Seminar owners and admins can manage permissions" ON seminar_permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM seminars s 
        WHERE s.id = seminar_permissions.seminar_id 
        AND (s.owner_id = auth.uid() OR public.user_has_role('admin'))
    )
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own seminar permissions" ON seminar_permissions FOR SELECT USING (
    user_id = auth.uid()
);

-- Users with permissions can view other permissions for the same seminar
CREATE POLICY "Users with seminar permissions can view other permissions" ON seminar_permissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM seminar_permissions sp2 
        WHERE sp2.seminar_id = seminar_permissions.seminar_id 
        AND sp2.user_id = auth.uid()
    )
);

-- Create helper function to check seminar permissions
CREATE OR REPLACE FUNCTION public.user_has_seminar_permission(seminar_uuid UUID, check_role seminar_role)
RETURNS boolean AS $$
BEGIN
  -- Check if user is seminar owner
  IF EXISTS (
    SELECT 1 FROM seminars 
    WHERE id = seminar_uuid AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin
  IF public.user_has_role('admin') THEN
    RETURN true;
  END IF;
  
  -- Check if user has the specific seminar permission
  RETURN EXISTS (
    SELECT 1 FROM seminar_permissions 
    WHERE seminar_id = seminar_uuid 
    AND user_id = auth.uid() 
    AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user can manage a seminar (owner, admin, or has any permission)
CREATE OR REPLACE FUNCTION public.user_can_manage_seminar(seminar_uuid UUID)
RETURNS boolean AS $$
BEGIN
  -- Check if user is seminar owner
  IF EXISTS (
    SELECT 1 FROM seminars 
    WHERE id = seminar_uuid AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin
  IF public.user_has_role('admin') THEN
    RETURN true;
  END IF;
  
  -- Check if user has any seminar permission
  RETURN EXISTS (
    SELECT 1 FROM seminar_permissions 
    WHERE seminar_id = seminar_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 