-- Add QR Codes table for storing temporary QR and numeric codes
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
    qr_code VARCHAR(100) NOT NULL,
    numeric_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(qr_code),
    UNIQUE(numeric_code)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_session_id ON qr_codes(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_numeric_code ON qr_codes(numeric_code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);

-- Add RLS policy for qr_codes table
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read QR codes for sessions they can access
CREATE POLICY "Users can read QR codes for accessible sessions" ON qr_codes
    FOR SELECT
    TO authenticated
    USING (
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

-- Allow owners and admins to create QR codes
CREATE POLICY "Owners and admins can create QR codes" ON qr_codes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND (
            seminar_id IN (
                SELECT sem.id FROM seminars sem WHERE sem.owner_id = auth.uid()
            )
            OR auth.uid() IN (
                SELECT u.id FROM users u WHERE u.role = 'admin'
            )
        )
    );

-- Allow automatic cleanup of expired codes
CREATE POLICY "Allow cleanup of expired QR codes" ON qr_codes
    FOR DELETE
    TO authenticated
    USING (expires_at < NOW());

COMMENT ON TABLE qr_codes IS 'Stores temporary QR codes and numeric codes for attendance verification'; 