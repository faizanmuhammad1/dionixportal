import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Map incoming fields to submissions columns for steps 2–6
    const submissionsUpdate: Record<string, any> = {};
    if (body.step2_data !== undefined) {
      // Merge with existing step2_data to avoid overwriting with nulls
      let existing: any = {};
      try {
        const { data: existingRow } = await supabase
          .from('submissions')
          .select('step2_data')
          .eq('submission_id', params.id)
          .single();
        existing = (existingRow as any)?.step2_data || {};
      } catch {}
      const merged = { ...(typeof existing === 'object' && existing ? existing : {}), ...(body.step2_data || {}) };
      // Remove null/undefined keys to prevent wiping values unintentionally
      for (const k of Object.keys(merged)) {
        const v = (merged as any)[k];
        if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
          delete (merged as any)[k];
        }
      }
      submissionsUpdate.step2_data = merged;
    }
    if (body.business_number !== undefined) submissionsUpdate.business_number = body.business_number;
    if (body.company_email !== undefined) submissionsUpdate.company_email = body.company_email;
    if (body.company_address !== undefined) submissionsUpdate.company_address = body.company_address;
    if (body.about_company !== undefined) submissionsUpdate.about_company = body.about_company;
    if (body.social_media_links !== undefined) submissionsUpdate.social_media_links = body.social_media_links;
    if (body.public_business_number !== undefined) submissionsUpdate.public_business_number = body.public_business_number;
    if (body.public_company_email !== undefined) submissionsUpdate.public_company_email = body.public_company_email;
    if (body.public_address !== undefined) submissionsUpdate.public_address = body.public_address;
    if (body.media_links !== undefined) submissionsUpdate.media_links = body.media_links;
    if (body.uploaded_media !== undefined) submissionsUpdate.uploaded_media = body.uploaded_media;
    if (body.bank_details !== undefined) submissionsUpdate.bank_details = body.bank_details;
    if (body.confirmation_checked !== undefined) submissionsUpdate.confirmation_checked = body.confirmation_checked;

    if (Object.keys(submissionsUpdate).length > 0) {
      const { error } = await supabase
        .from('submissions')
        .update(submissionsUpdate)
        .eq('submission_id', params.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort legacy table sync if present
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminSupabaseClient();
        const legacyUpdate: Record<string, any> = {};
        if (body.company_email !== undefined) legacyUpdate.company_email = body.company_email;
        if (body.company_address !== undefined) legacyUpdate.company_address = body.company_address;
        if (body.about_company !== undefined) legacyUpdate.company_details = body.about_company;
        if (body.public_business_number !== undefined) legacyUpdate.business_phone = body.public_business_number;
        if (body.public_company_email !== undefined) legacyUpdate.contact_email = body.public_company_email;
        if (body.public_address !== undefined) legacyUpdate.contact_address = body.public_address;
        if (body.social_media_links !== undefined) legacyUpdate.social_links = body.social_media_links;
        if (body.media_links !== undefined) legacyUpdate.media_links = body.media_links;
        if (body.step2_data?.selected_service !== undefined) legacyUpdate.selected_service = body.step2_data.selected_service;
        if (body.step2_data?.domain_suggestions !== undefined) legacyUpdate.domain_suggestions = body.step2_data.domain_suggestions;
        if (body.step2_data?.website_references !== undefined) legacyUpdate.website_references = body.step2_data.website_references;
        if (Object.keys(legacyUpdate).length > 0) {
          await admin.from('client_project_details').update(legacyUpdate).eq('id', params.id);
        }
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Deleting submission ${params.id} by user ${user.id}`);
    
    // Get submission info before deletion for logging and storage cleanup
    const { data: submissionInfo } = await supabase
      .from('submissions')
      .select('submission_id, client_name, status, uploaded_media, media_links')
      .eq('submission_id', params.id)
      .single();
    
    const submissionName = submissionInfo?.client_name || 'Unknown Submission';
    console.log(`Deleting submission: ${submissionName} (${params.id})`);
    
    // Collect potential storage paths from submission.uploaded_media if present
    const potentialStoragePaths: string[] = [];
    try {
      const media = (submissionInfo as any)?.uploaded_media;
      if (Array.isArray(media)) {
        for (const item of media) {
          if (typeof item === 'string') {
            potentialStoragePaths.push(item);
          } else if (item && typeof item === 'object') {
            if (typeof (item as any).storage_path === 'string') potentialStoragePaths.push((item as any).storage_path);
            if (typeof (item as any).path === 'string') potentialStoragePaths.push((item as any).path);
          }
        }
      }
    } catch {}

    // Also check legacy table client_project_details for matching id and uploaded_files
    let legacyUploadedFiles: string[] = [];
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminSupabaseClient();
        const { data: legacyRow } = await admin
          .from('client_project_details')
          .select('uploaded_files')
          .eq('id', params.id)
          .single();
        const files = (legacyRow as any)?.uploaded_files;
        if (Array.isArray(files)) {
          legacyUploadedFiles = files.filter((p: any) => typeof p === 'string');
        }
      }
    } catch {}

    // Try to remove any discovered storage objects (best-effort)
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminSupabaseClient();
        const pathsToRemove = [...new Set([...potentialStoragePaths, ...legacyUploadedFiles])];
        if (pathsToRemove.length > 0) {
          // Use the same convention as attachments deletion which passes full storage_path strings
          // Attempt removal from the common bucket used in the app
          await admin.storage.from('project-files').remove(pathsToRemove);
        }
      } else {
        console.warn('Skipping storage cleanup for submissions: SUPABASE_SERVICE_ROLE_KEY not set');
      }
    } catch (e) {
      console.error('Storage cleanup (submission) encountered an issue:', e);
    }

    // Delete the submission (primary table)
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('submission_id', params.id);
    
    if (error) {
      console.error('Delete submission error:', error);
      return NextResponse.json(
        { error: 'Failed to delete submission' },
        { status: 500 }
      );
    }

    // Also attempt to delete legacy row if exists (best-effort)
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminSupabaseClient();
        await admin
          .from('client_project_details')
          .delete()
          .eq('id', params.id);
      }
    } catch (e) {
      // Non-fatal
    }
    
    console.log(`Successfully deleted submission: ${submissionName}`);
    return NextResponse.json({ 
      message: `Submission "${submissionName}" deleted successfully` 
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
