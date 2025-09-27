import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 404 });
      return withCors(res);
    }
    return withCors(NextResponse.json({ job: data }));
  } catch (e: any) {
    const res = NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
    return withCors(res);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("jobs")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();
      
    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return withCors(res);
    }
    
    return withCors(NextResponse.json({ job: data }));
  } catch (e: any) {
    const res = NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
    return withCors(res);
  }
}