import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { projectService } from '@/lib/project-service';

export async function GET(
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

    const activities = await projectService.getProjectActivities(params.id);
    
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Get project activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project activities' },
      { status: 500 }
    );
  }
}