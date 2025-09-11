# Attendance Verification Bug Fix

## Overview

This document outlines the fix for a critical bug where users received "session not found" errors when trying to check attendance using QR codes or 6-digit numeric codes, even though they were properly enrolled in the seminar.

## Bug Description

### Symptoms
- Users got "Session not found" error when scanning QR codes
- Users got "Session not found" error when entering 6-digit numeric codes
- Error occurred even for enrolled users with approved status
- Attendance check completely failed for all users

### Error Message
```
"Session not found"
```

## Root Cause Analysis

### Issue 1: Inconsistent QR Verification Logic
The main problem was a mismatch between QR code generation and verification:

**QR Code Generation (POST method)**: ✅ Correctly stored codes in `qr_codes` table
```typescript
await supabase.from('qr_codes').insert({
  session_id: sessionId,
  seminar_id: seminarId,
  qr_code: qrCode,
  numeric_code: numericCode,
  // ...
});
```

**QR Code Verification (PUT method)**: ❌ Still trying to verify against `session.materials_url`
```typescript
// OLD BROKEN CODE
sessionQrData = JSON.parse(session.materials_url); // Wrong!
if (sessionQrData.qr_code !== qrCode) {
  return NextResponse.json({ error: 'Invalid QR code' });
}
```

### Issue 2: Missing RLS Policies
Users lacked the necessary Row Level Security policies to:
- INSERT their own attendance records
- UPDATE their own attendance records

The existing policies only allowed:
- Users to SELECT their own attendance
- Seminar owners/admins to manage all attendance

But no policy allowed users to create attendance via QR code check-in.

## Solutions Implemented

### 1. Fixed QR/Numeric Code Verification Logic

**File**: `src/app/api/seminars/[id]/attendance/qr/route.ts`

**Before** (Broken):
```typescript
// Tried to parse materials_url as QR data
sessionQrData = JSON.parse(session.materials_url);
if (sessionQrData.qr_code !== qrCode) {
  return error;
}
```

**After** (Fixed):
```typescript
// For numeric codes: already verified in qr_codes table lookup
// For QR codes: verify against qr_codes table
if (!numericCode) {
  const { data: storedQrCode } = await supabase
    .from('qr_codes')
    .select('id, expires_at')
    .eq('qr_code', qrCode)
    .eq('session_id', sessionId)
    .eq('seminar_id', seminarId)
    .single();
    
  if (!storedQrCode) {
    return NextResponse.json({ error: 'Invalid or expired QR code' });
  }
}
```

### 2. Enhanced Session Verification

**Improvements**:
- Added proper error logging for debugging
- Enhanced session lookup with seminar information
- Better error messages for users
- Improved enrollment status checking

```typescript
// Enhanced session lookup with seminar info
const { data: session, error: sessionError } = await supabase
  .from('sessions')
  .select(`
    id,
    seminar_id,
    materials_url,
    seminars!inner (
      id,
      title,
      owner_id
    )
  `)
  .eq('id', sessionId)
  .eq('seminar_id', seminarId)
  .single();
```

### 3. Added Missing RLS Policies

**File**: `scripts/fix-attendance-rls-for-users.sql`

Added two critical policies:

**Policy 1: Allow users to create attendance**
```sql
CREATE POLICY "Users can create their own attendance via QR code" ON public.attendances
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.sessions s ON s.seminar_id = e.seminar_id
      WHERE e.user_id = auth.uid() 
      AND e.status = 'approved'
      AND s.id = attendances.session_id
    )
  );
```

**Policy 2: Allow users to update attendance**
```sql
CREATE POLICY "Users can update their own attendance via QR code" ON public.attendances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.sessions s ON s.seminar_id = e.seminar_id
      WHERE e.user_id = auth.uid() 
      AND e.status = 'approved'
      AND s.id = attendances.session_id
    )
  );
```

### 4. Enhanced Error Handling and Logging

**Improvements**:
- Added specific error logging for debugging
- Better error messages for users
- Enhanced enrollment status checking
- Support for updating existing attendance records

```typescript
// Enhanced enrollment check with logging
if (enrollmentError || !enrollment) {
  console.error('Enrollment check error:', enrollmentError);
  console.log('User enrollment check - User ID:', user.id, 'Seminar ID:', seminarId);
  return NextResponse.json({ 
    error: 'You are not enrolled in this seminar or your enrollment is not approved' 
  }, { status: 403 });
}
```

### 5. Created Debug API Endpoint

**File**: `src/app/api/debug/attendance-check/route.ts`

Created a comprehensive debugging endpoint that checks:
- Session existence and validity
- User enrollment status  
- QR code/numeric code verification
- Current attendance status
- User permissions
- Provides specific recommendations for fixing issues

**Usage**:
```bash
POST /api/debug/attendance-check
{
  "seminarId": "uuid",
  "sessionId": "uuid", 
  "qrCode": "optional",
  "numericCode": "optional"
}
```

## Database Changes Required

### 1. Apply RLS Policy Fix
Run the SQL script to add missing attendance policies:
```bash
# In Supabase SQL Editor
-- Run: scripts/fix-attendance-rls-for-users.sql
```

### 2. Verify QR Codes Table
Ensure the `qr_codes` table exists with proper structure:
```bash
# If not already applied
-- Run: scripts/add-qr-codes-table.sql
```

## Testing the Fix

### 1. QR Code Flow Test
1. Teacher generates QR code for session
2. Student scans QR code
3. ✅ Attendance should be recorded successfully
4. Student can scan again to update attendance

### 2. Numeric Code Flow Test  
1. Teacher generates 6-digit code for session
2. Student enters numeric code
3. ✅ Attendance should be recorded successfully
4. Student can enter code again to update attendance

### 3. Error Scenarios Test
1. **Expired codes**: Should get "expired" error
2. **Invalid codes**: Should get "invalid" error  
3. **Non-enrolled users**: Should get "not enrolled" error
4. **Non-existent sessions**: Should get "session not found" error

### 4. Debug Endpoint Test
Use the debug endpoint to verify all components:
```javascript
// Test debugging
fetch('/api/debug/attendance-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    seminarId: 'your-seminar-id',
    sessionId: 'your-session-id',
    qrCode: 'your-qr-code', // or
    numericCode: 'your-numeric-code'
  })
});
```

## Performance Improvements

### Database Query Optimization
- Reduced number of database queries by combining lookups
- Eliminated unnecessary `materials_url` parsing
- More efficient session and enrollment verification

### Error Handling
- Earlier validation to prevent unnecessary processing
- Better error categorization for user experience
- Comprehensive logging for debugging

## Security Considerations

### RLS Policy Security
The new policies are secure because they:
- Only allow users to create/update their own attendance
- Require valid enrollment with approved status
- Verify session belongs to enrolled seminar
- Use proper authentication context (`auth.uid()`)

### QR Code Security
- QR codes expire after 10 minutes
- Codes are tied to specific sessions and seminars
- Automatic cleanup of expired codes
- Verification against stored database records (not just client data)

## Monitoring and Maintenance

### Key Metrics to Monitor
1. **Attendance Success Rate**: % of successful QR/numeric code scans
2. **Error Rates**: Track specific error types
3. **Session Not Found Errors**: Should be near zero after fix
4. **Enrollment Issues**: Monitor enrollment status problems

### Regular Maintenance
1. **QR Code Cleanup**: Automatic cleanup of expired codes
2. **Policy Review**: Periodic review of RLS policies
3. **Error Log Review**: Monitor error patterns
4. **Performance Monitoring**: Track attendance API response times

## Future Enhancements

### Potential Improvements
1. **Caching**: Cache enrollment status for faster lookups
2. **Batch Processing**: Support multiple attendance records at once
3. **Offline Support**: Allow offline QR scanning with sync
4. **Analytics**: Track attendance patterns and insights

## Rollback Plan

If issues arise, the rollback process:

1. **Remove new RLS policies**:
```sql
DROP POLICY "Users can create their own attendance via QR code" ON attendances;
DROP POLICY "Users can update their own attendance via QR code" ON attendances;
```

2. **Revert API changes**: Git revert to previous version
3. **Monitor**: Watch for any remaining issues
4. **Alternative approach**: Manual attendance management until fix

The fix is backward compatible and should not require rollback. 