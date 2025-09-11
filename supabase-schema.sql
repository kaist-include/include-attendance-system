-- Supabase Database Schema for Include Attendance System
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE seminar_status AS ENUM ('draft', 'recruiting', 'in_progress', 'completed', 'cancelled');
CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE notification_type AS ENUM ('enrollment_approved', 'enrollment_rejected', 'session_reminder', 'seminar_updated', 'announcement', 'attendance_marked');
CREATE TYPE permission_role AS ENUM ('owner', 'assistant', 'viewer');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email CHARACTER VARYING UNIQUE NOT NULL,
    name CHARACTER VARYING NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nickname CHARACTER VARYING,
    department CHARACTER VARYING,
    student_id CHARACTER VARYING,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Semesters table
CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name CHARACTER VARYING NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seminars table
CREATE TABLE seminars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title CHARACTER VARYING NOT NULL,
    description TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    location CHARACTER VARYING,
    tags TEXT[] DEFAULT '{}',
    status seminar_status DEFAULT 'draft',
    application_start TIMESTAMP WITH TIME ZONE NOT NULL,
    application_end TIMESTAMP WITH TIME ZONE NOT NULL,
    external_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    title CHARACTER VARYING NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    location CHARACTER VARYING,
    external_url TEXT,
    status session_status DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    status enrollment_status DEFAULT 'pending',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    UNIQUE(user_id, seminar_id)
);

-- Attendances table
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'absent',
    checked_at TIMESTAMP WITH TIME ZONE,
    checked_by UUID REFERENCES users(id),
    notes TEXT,
    qr_code CHARACTER VARYING,
    UNIQUE(user_id, session_id)
);

-- QR Codes table for storing temporary QR and numeric codes
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    qr_code CHARACTER VARYING NOT NULL UNIQUE,
    numeric_code CHARACTER VARYING NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    title CHARACTER VARYING NOT NULL,
    content TEXT NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title CHARACTER VARYING NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seminar permissions table
CREATE TABLE seminar_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role permission_role NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seminar_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_seminar_id ON sessions(seminar_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_seminar_id ON enrollments(seminar_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_session_id ON attendances(session_id);
CREATE INDEX idx_attendances_status ON attendances(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_qr_codes_session_id ON qr_codes(session_id);
CREATE INDEX idx_qr_codes_numeric_code ON qr_codes(numeric_code);
CREATE INDEX idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX idx_announcements_seminar_id ON announcements(seminar_id);
CREATE INDEX idx_announcements_is_global ON announcements(is_global);
CREATE INDEX idx_announcements_is_pinned ON announcements(is_pinned);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminar_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can view all users" ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Semesters policies (readable by all authenticated users)
CREATE POLICY "Authenticated users can view semesters" ON semesters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage semesters" ON semesters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Seminars policies
CREATE POLICY "Authenticated users can view seminars" ON seminars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners and admins can create seminars" ON seminars FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
CREATE POLICY "Owners and admins can update seminars" ON seminars FOR UPDATE USING (
  auth.uid() = owner_id OR 
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
CREATE POLICY "Admin can delete any seminar" ON seminars FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Sessions policies
CREATE POLICY "Authenticated users can view sessions" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Seminar owners and admins can manage sessions" ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = sessions.seminar_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);
CREATE POLICY "Admin can delete any session" ON sessions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own enrollments" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Seminar owners and admins can view all enrollments" ON enrollments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = enrollments.seminar_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);
CREATE POLICY "Seminar owners and admins can update enrollments" ON enrollments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = enrollments.seminar_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);
CREATE POLICY "Admin can delete any enrollment" ON enrollments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Attendances policies
CREATE POLICY "Users can view their own attendance" ON attendances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attendance via QR code" ON attendances FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN sessions s ON s.seminar_id = e.seminar_id
    WHERE e.user_id = auth.uid() 
    AND e.status = 'approved'
    AND s.id = attendances.session_id
  )
);
CREATE POLICY "Users can update their own attendance via QR code" ON attendances FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN sessions s ON s.seminar_id = e.seminar_id
      WHERE e.user_id = auth.uid() 
      AND e.status = 'approved'
      AND s.id = attendances.session_id
    )
  );
CREATE POLICY "Seminar owners and admins can manage attendances" ON attendances FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sessions 
    JOIN seminars ON seminars.id = sessions.seminar_id 
    WHERE sessions.id = attendances.session_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);
CREATE POLICY "Admin can delete any attendance" ON attendances FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- QR Codes policies
CREATE POLICY "Users can read QR codes for accessible sessions" ON qr_codes FOR SELECT TO authenticated USING (
  session_id IN (
    SELECT s.id FROM sessions s
    INNER JOIN seminars sem ON s.seminar_id = sem.id
    WHERE sem.owner_id = auth.uid()
       OR auth.uid() IN (
           SELECT u.id FROM users u WHERE u.role = 'admin'
       )
       OR s.seminar_id IN (
           SELECT e.seminar_id FROM enrollments e 
           WHERE e.user_id = auth.uid() AND e.status = 'approved'
       )
  )
);
CREATE POLICY "Owners and admins can create QR codes" ON qr_codes FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    seminar_id IN (
      SELECT sem.id FROM seminars sem WHERE sem.owner_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT u.id FROM users u WHERE u.role = 'admin'
    )
  )
);
CREATE POLICY "Allow cleanup of expired QR codes" ON qr_codes FOR DELETE TO authenticated USING (expires_at < NOW());

-- Announcements policies
CREATE POLICY "Authenticated users can view announcements" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Seminar owners and admins can manage announcements" ON announcements FOR ALL USING (
  (seminar_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')) OR
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = announcements.seminar_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);

-- Comments policies
CREATE POLICY "Authenticated users can view comments" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Seminar owners and admins can manage comments" ON comments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = comments.seminar_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Seminar permissions policies
CREATE POLICY "Users can view permissions for seminars they're involved with" ON seminar_permissions FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = seminar_permissions.seminar_id AND seminars.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
CREATE POLICY "Seminar owners and admins can manage permissions" ON seminar_permissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM seminars WHERE seminars.id = seminar_permissions.seminar_id AND 
    (seminars.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
);

COMMENT ON TABLE qr_codes IS 'Stores temporary QR codes and numeric codes for attendance verification';
COMMENT ON TABLE seminar_permissions IS 'Stores additional permissions for seminar management';

-- Refresh the schema
NOTIFY pgrst, 'reload schema'; 