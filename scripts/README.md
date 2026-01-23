# Scripts Documentation

This directory contains utility scripts for managing the NamClass platform.

## Create Super Admin User

There are two ways to create a super admin user:

### Method 1: Using TypeScript Script (Recommended)

This is the easiest and most automated method.

**Prerequisites:**
- Node.js installed
- `.env.local` file configured with Supabase credentials

**Steps:**

1. Make sure your `.env.local` has these variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Run the script:
```bash
npx tsx scripts/create-super-admin.ts
```

The script will:
- Create an auth user in Supabase Auth
- Create a user profile in the `users` table
- Set the role to `super_admin`
- Confirm email automatically

**Default Credentials:**
- Email: `ismaelmvula@gmail.com`
- Password: `NdapuniKwa@1953`
- Name: `Ismael Mvula`

### Method 2: Using SQL Migration

If you prefer to use SQL directly in the Supabase Dashboard:

**Steps:**

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" and create user with:
   - Email: `ismaelmvula@gmail.com`
   - Password: `NdapuniKwa@1953`
   - Check "Auto Confirm User"
3. Copy the User ID from the created user
4. Go to Supabase Dashboard → SQL Editor
5. Open the file: `supabase/migrations/027_create_super_admin.sql`
6. Uncomment the INSERT statement
7. Replace `<USER_ID>` with the actual UUID
8. Run the SQL

### Method 3: Via Supabase Dashboard Only

Quick manual method:

1. **Create Auth User:**
   - Dashboard → Authentication → Users → Add User
   - Email: `ismaelmvula@gmail.com`
   - Password: `NdapuniKwa@1953`
   - Auto confirm: Yes

2. **Create User Profile:**
   - Dashboard → Table Editor → users table → Insert row
   - id: (paste the auth user UUID)
   - email: `ismaelmvula@gmail.com`
   - full_name: `Ismael Mvula`
   - role: `super_admin`
   - center_id: `NULL`
   - is_active: `true`

## Other Scripts

### migrate-clients.ts
Migrates client data between versions.

### run-client-migration.ts
Runs client-specific data migrations.

### run-migration-003.ts
Runs a specific migration (003).

### run-sql-migration.ts
Utility for running SQL migrations programmatically.

## Important Notes

- **Service Role Key**: Never commit your `SUPABASE_SERVICE_ROLE_KEY` to version control
- **Super Admin Access**: Super admins have full system access - use carefully
- **Password Security**: Change the default password after first login
- **Backup**: Always backup your database before running migrations
