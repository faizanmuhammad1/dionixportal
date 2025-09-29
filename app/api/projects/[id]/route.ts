import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ProjectService } from '@/lib/project-service';
import { ProjectFormData } from '@/lib/types/project';
import { withAuth } from '@/lib/api-middleware';

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

    const projectService = new ProjectService(supabase);
    const project = await projectService.getProject(params.id);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const updates: Partial<ProjectFormData> = body;

    const projectService = new ProjectService(supabase);
    const project = await projectService.updateProject(params.id, updates);
    
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      console.log(`Deleting project ${params.id} by user ${user.id}`);
      
      // Get project info before deletion for logging
      const supabase = createServerSupabaseClient();
      const { data: projectInfo } = await supabase
        .from('projects')
        .select('project_name, project_id')
        .eq('id', params.id)
        .single();
      
      const projectName = projectInfo?.project_name || 'Unknown Project';
      console.log(`Deleting project: ${projectName} (${params.id})`);
      
      // Create ProjectService with server-side Supabase client
      const serverProjectService = new ProjectService(supabase);
      await serverProjectService.deleteProject(params.id);
      
      console.log(`Successfully deleted project: ${projectName}`);
      return NextResponse.json({ 
        message: `Project "${projectName}" and all its attachments/comments deleted successfully` 
      });
    } catch (error) {
      console.error('Delete project error:', error);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin'],
    permissions: ['projects:delete']
  }
);
