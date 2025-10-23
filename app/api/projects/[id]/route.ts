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

    // Get user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'employee';

    // Get the project
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', params.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if employee has access to this project
    if (userRole === 'employee') {
      const { data: membership } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Check user role for authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'employee';
    
    // Only admin and manager can update projects
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions to update projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("Received update data for project:", params.id, body);
    const updates: Partial<ProjectFormData> = body;

    const projectService = new ProjectService(supabase);
    const project = await projectService.updateProject(params.id, updates);
    
    console.log("Project updated successfully:", params.id);
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(
  async (context, routeParams) => {
    try {
      const { user, request } = context;
      const params = routeParams?.params;
      if (!params?.id) {
        return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
      }

      console.log(`Deleting project ${params.id} by user ${user.id}`);
      
      // Get project info before deletion for logging
      const supabase = createServerSupabaseClient();
      const { data: projectInfo } = await supabase
        .from('projects')
        .select('project_name, project_id')
        .eq('project_id', params.id)
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
        { error: 'Failed to delete project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin'],
    permissions: ['projects:delete']
  }
);
