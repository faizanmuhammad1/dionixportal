import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
    
    // Get submission info before deletion for logging
    const { data: submissionInfo } = await supabase
      .from('submissions')
      .select('submission_id, client_name, status')
      .eq('submission_id', params.id)
      .single();
    
    const submissionName = submissionInfo?.client_name || 'Unknown Submission';
    console.log(`Deleting submission: ${submissionName} (${params.id})`);
    
    // Delete the submission
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
