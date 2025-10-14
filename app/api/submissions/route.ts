import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { validateInput, submissionCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_pending_submissions");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissions: data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // SECURITY: Validate input data
    const validation = validateInput(submissionCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid input data", 
        details: validation.errors 
      }, { status: 400 });
    }
    
    const supabase = createClient();

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        client_id: user.id,
        project_type: body.project_type,
        description: body.description,
        client_name: body.client_name,
        budget: body.budget || 0,
        start_date: body.start_date,
        end_date: body.end_date,
        priority: body.priority || "medium",
        step2_data: body.step2_data,
        business_number: body.business_number,
        company_email: body.company_email,
        company_address: body.company_address,
        about_company: body.about_company,
        social_media_links: body.social_media_links,
        public_business_number: body.public_business_number,
        public_company_email: body.public_company_email,
        public_address: body.public_address,
        media_links: body.media_links,
        uploaded_media: body.uploaded_media,
        bank_details: body.bank_details,
        confirmation_checked: body.confirmation_checked || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
