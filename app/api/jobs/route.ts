import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
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
