import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(
  async ({ user, request }) => {
    try {
      const body = await request.json();
      const { submission_id, step1_data } = body;

      console.log("Approve submission request:", { submission_id, step1_data, user_id: user.id });

      if (!submission_id) {
        console.log("Missing submission_id");
        return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
      }

      const supabase = createServerSupabaseClient();
      
      // Always fetch the submission to get step2_data and other details
      const { data: submission, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .eq('submission_id', submission_id)
        .single();

      if (fetchError || !submission) {
        console.log("Failed to fetch submission:", fetchError);
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // Log step2_data from submission - ensure it's properly formatted
      let step2Data = submission.step2_data;
      
      // Handle case where step2_data might be a string (JSON stringified)
      if (typeof step2Data === 'string') {
        try {
          step2Data = JSON.parse(step2Data);
        } catch (e) {
          console.warn("Failed to parse step2_data string:", e);
          step2Data = null;
        }
      }
      
      // Ensure step2_data is a valid object
      if (step2Data && typeof step2Data !== 'object') {
        console.warn("step2_data is not an object, setting to null");
        step2Data = null;
      }
      
      console.log("Submission step2_data:", {
        has_data: !!step2Data,
        is_object: typeof step2Data === 'object',
        keys: step2Data && typeof step2Data === 'object' 
          ? Object.keys(step2Data) 
          : [],
        value: step2Data,
        raw_value: submission.step2_data
      });

      // If step1_data is missing or invalid, create default step1_data from submission
      let finalStep1Data = step1_data;
      
      if (!step1_data || typeof step1_data !== 'object' || Object.keys(step1_data).length === 0) {
        console.log("step1_data is missing or invalid, creating default from submission");
        
        finalStep1Data = {
          project_name: submission.client_name || "Unknown Client",
          description: submission.description || "No description provided",
          budget: submission.budget || 0,
          start_date: submission.start_date || null,
          end_date: submission.end_date || null,
          status: "planning",
          priority: submission.priority || "medium"
        };
        
        console.log("Created default step1_data:", finalStep1Data);
      }

      // Call the RPC function - it already includes step2_data from submission_record.step2_data
      // The RPC function inserts: submission_record.step2_data directly into projects.step2_data
      const { data: projectId, error } = await supabase.rpc("approve_submission", {
        submission_id_param: submission_id,
        step1_data: finalStep1Data,
        admin_id: user.id,
      });

      if (error) {
        console.error("RPC error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!projectId) {
        console.error("RPC returned no project_id");
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
      }

      // Verify step2_data was saved correctly by the RPC function
      const { data: createdProject, error: projectFetchError } = await supabase
        .from('projects')
        .select('project_id, step2_data, project_type, service_specific')
        .eq('project_id', projectId)
        .single();

      if (projectFetchError) {
        console.error("Error fetching created project:", projectFetchError);
      } else {
        console.log("Created project verification:", {
          project_id: createdProject.project_id,
          has_step2_data: !!createdProject.step2_data,
          step2_data_type: typeof createdProject.step2_data,
          step2_data_keys: createdProject.step2_data && typeof createdProject.step2_data === 'object'
            ? Object.keys(createdProject.step2_data)
            : [],
          step2_data_value: createdProject.step2_data,
          project_type: createdProject.project_type
        });

        // Check if step2_data needs to be updated
        // The RPC should have already included it, but verify and fix if needed
        const submissionHasStep2 = step2Data && 
          typeof step2Data === 'object' && 
          Object.keys(step2Data).length > 0;
        
        // Check if project has meaningful step2_data (not just empty object)
        let projectStep2Data = createdProject.step2_data;
        if (typeof projectStep2Data === 'string') {
          try {
            projectStep2Data = JSON.parse(projectStep2Data);
          } catch (e) {
            projectStep2Data = null;
          }
        }
        
        const projectHasStep2 = projectStep2Data && 
          typeof projectStep2Data === 'object' && 
          Object.keys(projectStep2Data).length > 0;

        // If submission has step2_data but project doesn't, update it
        if (submissionHasStep2 && !projectHasStep2) {
          console.log("⚠️ Project missing step2_data, updating from submission");
          console.log("Submission step2_data to transfer:", step2Data);
          
          const { error: updateError } = await supabase
            .from('projects')
            .update({ 
              step2_data: step2Data
            })
            .eq('project_id', projectId);

          if (updateError) {
            console.error("❌ Error updating project with step2_data:", updateError);
            // Try one more time with explicit JSONB cast
            const { error: retryError } = await supabase
              .from('projects')
              .update({ 
                step2_data: step2Data as any
              })
              .eq('project_id', projectId);
            
            if (retryError) {
              console.error("❌ Retry also failed:", retryError);
            } else {
              console.log("✅ Successfully updated project with step2_data (retry)");
            }
          } else {
            console.log("✅ Successfully updated project with step2_data");
          }
        } else if (submissionHasStep2 && projectHasStep2) {
          console.log("✅ Project already has step2_data from RPC function");
        } else if (!submissionHasStep2) {
          console.log("ℹ️ Submission has no step2_data to transfer");
        }
      }

      return NextResponse.json({ project_id: projectId });
    } catch (error) {
      console.error("Approve submission error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  {
    roles: ["admin"],
    permissions: ["submissions:approve"]
  }
);
