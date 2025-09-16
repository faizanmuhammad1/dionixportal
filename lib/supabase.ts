import { createBrowserClient } from "@supabase/ssr"

// Browser client must use public env vars only to avoid leaking secrets
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient(url, anonKey)
}

// Server-side client lives in lib/supabase-server.ts to avoid RSC import issues
