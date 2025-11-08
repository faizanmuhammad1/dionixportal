import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withCors(res: NextResponse) {
  // SECURE CORS - Only allow specific origins
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS || 'https://dionix.ai,https://portal.dionix.ai').split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  const origin = res.headers.get('origin') || res.headers.get('referer');
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin?.includes(allowed) || origin === allowed
  );
  
  if (isAllowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", origin || allowedOrigins[0]);
  }
  
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );
  return res;
}

export async function OPTIONS() {
  return withCors(NextResponse.json({}, { status: 204 }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return withCors(res);
    }
    return withCors(NextResponse.json({ jobs: data || [] }));
  } catch (e: any) {
    const res = NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
    return withCors(res);
  }
}
