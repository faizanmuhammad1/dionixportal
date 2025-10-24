# Environment Setup Guide - DIONIX Portal

## Quick Setup Steps

### 1. Create `.env.local` File

Create a file named `.env.local` in the root directory of your project with the following content:

```env
# ===========================================
# SUPABASE CONFIGURATION (REQUIRED)
# ===========================================

# Your Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Key (Public - Safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ CRITICAL: Service Role Key (KEEP SECRET!)
# This key has admin access and bypasses Row Level Security (RLS)
# NEVER expose this key to the client or commit to git
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Alternative format (both work)
SUPABASE_URL=https://your-project-id.supabase.co
```

### 2. Where to Get These Keys

#### From Supabase Dashboard:

1. **Go to your Supabase project**
   - Visit: https://app.supabase.com

2. **Navigate to Settings**
   - Click on your project
   - Go to: **Settings** → **API**

3. **Copy the keys:**
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (Keep Secret!)

### 3. Security Warning

⚠️ **IMPORTANT**: The `SUPABASE_SERVICE_ROLE_KEY` is an admin key that:
- Bypasses all Row Level Security (RLS) policies
- Has full read/write access to your database
- Should NEVER be exposed to the client-side
- Should NEVER be committed to version control

**How we use it safely:**
- Only used in **server-side code** (API routes, server components)
- Used via `createAdminSupabaseClient()` function
- For operations that require admin access (like reading project members with profile data)

---

## Complete Environment Variables

Here's the full `.env.local` template with all optional configurations:

```env
# ===========================================
# REQUIRED: SUPABASE CONFIGURATION
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_URL=https://your-project-id.supabase.co

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=development
NEXTAUTH_SECRET=generate_random_32_character_string_here
NEXTAUTH_URL=http://localhost:3000

# ===========================================
# PRODUCTION: CORS CONFIGURATION
# ===========================================
ALLOWED_ORIGINS=https://dionix.ai,https://portal.dionix.ai

# ===========================================
# OPTIONAL: EMAIL CONFIGURATION
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM=noreply@dionix.ai

# ===========================================
# FILE UPLOAD CONFIGURATION
# ===========================================
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# ===========================================
# SECURITY FEATURES
# ===========================================
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_INPUT_VALIDATION=true

# ===========================================
# OPTIONAL: DATABASE DIRECT CONNECTION
# ===========================================
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# ===========================================
# OPTIONAL: REDIS (for caching)
# ===========================================
REDIS_URL=redis://localhost:6379

# ===========================================
# OPTIONAL: MONITORING
# ===========================================
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info
```

---

## Verification Steps

### 1. Check if Environment Variables are Loaded

Create a test file: `app/api/test-env/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV
  });
}
```

Visit: `http://localhost:3000/api/test-env`

Expected output:
```json
{
  "hasSupabaseUrl": true,
  "hasAnonKey": true,
  "hasServiceKey": true,
  "nodeEnv": "development"
}
```

### 2. Test Admin Client Connection

The admin client is used in:
- `/api/projects/[id]/members/route.ts` - Reading project members with profiles
- Other API routes that need RLS bypass

---

## Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

**Solution:**
1. Check `.env.local` exists in project root
2. Verify keys are copied correctly (no extra spaces)
3. Restart your development server: `pnpm dev`

### Error: "permission denied for table users"

**Solution:**
- This error occurs when using regular client instead of admin client
- Use `createAdminSupabaseClient()` for operations that need RLS bypass
- Already fixed in `/api/projects/[id]/members/route.ts`

### Service Role Key Not Working

**Check:**
1. Key starts with `eyJ` and is very long
2. No extra quotes or spaces
3. File is named exactly `.env.local`
4. Server was restarted after adding the key

---

## Best Practices

### ✅ DO:
- Keep `.env.local` in `.gitignore`
- Use different keys for development/production
- Rotate keys periodically
- Use admin client only in API routes
- Log when admin client is used

### ❌ DON'T:
- Commit `.env.local` to git
- Expose service role key to client
- Use admin client from client components
- Share keys in screenshots or documentation
- Use production keys in development

---

## Production Deployment

For production (Vercel, etc.):

1. **Add environment variables in hosting dashboard:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (encrypted/secret)

2. **Use separate Supabase project for production**

3. **Enable additional security:**
   ```env
   NODE_ENV=production
   ENABLE_CSRF_PROTECTION=true
   ENABLE_RATE_LIMITING=true
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

---

## Support

If you encounter issues:
1. Check this guide first
2. Verify all required keys are set
3. Restart development server
4. Check browser console for errors
5. Check server logs: `pnpm dev` terminal output

