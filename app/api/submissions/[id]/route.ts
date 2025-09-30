import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

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
