# Setup Admin Profile Guide

This guide helps you set up the `admin@dionix.ai` profile in the `profiles` table.

## Method 1: Using API Endpoint (Recommended)

1. **Start your development server:**
   ```bash
   pnpm run dev
   ```

2. **Call the setup endpoint:**
   
   Using curl:
   ```bash
   curl -X POST http://localhost:3000/api/setup-admin-profile \
     -H "Content-Type: application/json" \
     -b "your-session-cookie"
   ```
   
   Or using the browser console while logged in as admin:
   ```javascript
   fetch('/api/setup-admin-profile', {
     method: 'POST',
     credentials: 'same-origin'
   })
   .then(res => res.json())
   .then(data => console.log(data))
   ```

3. **Log out and log back in** to get a fresh JWT token with the updated role.

## Method 2: Using SQL (Alternative)

If you prefer to run SQL directly in the Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Run the SQL from `setup_admin_profile.sql`

The SQL script will:
- Find the admin user by email (`admin@dionix.ai`)
- Create or update their profile in the `profiles` table
- Update their `auth.users` metadata to include the role
- Verify the setup was successful

## Verification

After setup, verify the admin profile exists:

```sql
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.role,
  p.status,
  u.email,
  u.raw_user_meta_data->>'role' as role_in_metadata
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'admin@dionix.ai';
```

You should see:
- `role`: `admin`
- `status`: `active`
- `role_in_metadata`: `admin`

## Troubleshooting

### Issue: "Admin user not found"
- Make sure `admin@dionix.ai` exists in `auth.users`
- Check the email spelling and case

### Issue: Profile exists but role is not in JWT
- Log out and log back in to get a fresh token
- Check that `raw_user_meta_data->>'role'` is `'admin'` in `auth.users`

### Issue: RLS Policy Error
- The admin user needs proper RLS policies
- Make sure the `service_role` key is being used for admin operations
- Check that `profiles` table has the correct RLS policies

