# Supabase Setup Guide

This guide will help you connect your Include Attendance System to Supabase.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Project Name**: `Include Attendance System`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (usually takes 1-2 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Project API Keys**:
     - `anon` `public` key (for client-side)
     - `service_role` `secret` key (for server-side)

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in your project root
2. Add the following environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Replace the placeholder values with your actual Supabase credentials.

## Step 4: Create Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the `supabase-schema.sql` file from your project root
3. Copy all the SQL content and paste it into the SQL Editor
4. Click **Run** to execute the schema

This will create:
- All required tables (users, seminars, sessions, etc.)
- Database indexes for performance
- Row Level Security (RLS) policies for data security
- Automatic triggers for user profile creation
- Timestamp update triggers

## Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Configure the following:

### Site URL
- Set to `http://localhost:3000` for development
- Update to your production URL when deploying

### Email Templates (Optional)
- Customize confirmation and password reset emails
- Go to **Authentication** → **Email Templates**

### Providers (Optional)
- Enable additional auth providers if needed
- Go to **Authentication** → **Providers**

## Step 6: Test the Connection

1. Start your development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000`
3. Try to register a new user
4. Check the Supabase dashboard **Authentication** → **Users** to see if the user was created
5. Check the **Table Editor** to see if the user profile was automatically created

## Step 7: Verify Database Connection

After successful user registration, verify in Supabase:

1. Go to **Table Editor**
2. Check the `users` table - should have your new user
3. Check the `profiles` table - should have the user's profile
4. Test creating a semester from your admin panel
5. Test creating a seminar

## Security Features Included

### Row Level Security (RLS)
- Users can only see their own data
- Seminar owners can manage their seminars
- Admins have elevated permissions

### Automatic User Profile Creation
- When a user registers via Supabase Auth, a trigger automatically:
  - Creates an entry in the `users` table
  - Creates a profile in the `profiles` table
  - Sets default role as 'member'

### Data Validation
- Database constraints ensure data integrity
- Enum types provide consistent status values
- Foreign key relationships maintain referential integrity

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables" error**
   - Make sure `.env.local` file exists in project root
   - Verify all three environment variables are set correctly
   - Restart your development server after adding variables

2. **Authentication not working**
   - Check Site URL in Supabase Auth settings
   - Verify API keys are correct
   - Check browser console for error messages

3. **Database connection errors**
   - Ensure the schema was executed successfully
   - Check if RLS policies are enabled
   - Verify your service role key has correct permissions

4. **User profile not created automatically**
   - Check if the trigger function was created
   - Verify the trigger is active in Supabase
   - Check Supabase logs for errors

### Getting Help

If you encounter issues:
1. Check the Supabase dashboard logs
2. Look at browser console errors
3. Verify your environment variables
4. Check that the database schema was applied correctly

## Next Steps

After successful setup:
1. Create an admin user and promote them to admin role
2. Set up your first semester
3. Create test seminars
4. Test the attendance system

Your Supabase database is now connected and ready to use! 