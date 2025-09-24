import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook to receive push notifications about new emails and fan out to clients via Supabase Realtime broadcast
export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("x-webhook-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const expected = process.env.EMAIL_WEBHOOK_TOKEN;
    if (!expected || token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await req.json();
    const admin = createAdminSupabaseClient();
    // Broadcast to channel "emails-inbox" with event "new-email"
    // This uses the Postgres Realtime broadcast over the Realtime channel
    // Supabase JS v2 supports channel.send for broadcast events
    // Since this is a server route, use REST to invoke the Realtime broadcast via the Realtime REST endpoint
    // However, the simplest is to insert into a dedicated table that triggers a realtime broadcast.
    // We'll use the Realtime "broadcast" via rest: admin.realtime is not exposed in SSR; instead, write to edge function is heavier.
    // Use supabase channel over server client once available; fallback: insert into a lightweight table if configured.

    // Direct broadcast via Realtime REST endpoint
    const url = (process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace(/\/$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "emails-inbox",
        event: "new-email",
        payload,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Realtime broadcast failed:", text);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
