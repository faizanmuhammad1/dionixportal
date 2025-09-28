import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { projectService } from '@/lib/project-service';

export async function POST(
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

    const project = await projectService.confirmProject(params.id);
    
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Confirm project error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm project' },
      { status: 500 }
    );
  }
}