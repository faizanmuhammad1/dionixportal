import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ProjectService } from '@/lib/project-service';
import { ProjectFormData } from '@/lib/types/project';
import { withAuth, withCors } from '@/lib/api-middleware';

export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const supabase = createServerSupabaseClient();
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const projectId = routeParams?.params?.id || resolvedParams.params.id;

      if (!projectId) {
        return withCors(NextResponse.json({ error: 'Project ID is required' }, { status: 400 }));
      }

      // Get the project
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !project) {
        return withCors(NextResponse.json({ error: 'Project not found' }, { status: 404 }));
      }

      // Check if employee/client has access to this project
      if (user.role === 'employee') {
        const { data: membership } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          return withCors(NextResponse.json(
            { error: 'You do not have access to this project' },
            { status: 403 }
          ));
        }
      } else if (user.role === 'client') {
        // Clients can only see their own projects
        if (project.client_id !== user.id) {
          return withCors(NextResponse.json(
            { error: 'You do not have access to this project' },
            { status: 403 }
          ));
        }
      }

      return withCors(NextResponse.json({ project }));
    } catch (error) {
      console.error('Get project error:', error);
      return withCors(NextResponse.json(
        { error: 'Failed to fetch project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      ));
    }
  },
  {
    roles: ['admin', 'manager', 'employee', 'client'],
    permissions: ['projects:read']
  }
)

export const PUT = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const projectId = routeParams?.params?.id || resolvedParams.params.id;

      if (!projectId) {
        return withCors(NextResponse.json({ error: 'Project ID is required' }, { status: 400 }));
      }

      // Only admin and manager can update projects
      if (user.role !== 'admin' && user.role !== 'manager') {
        return withCors(NextResponse.json(
          { error: 'Insufficient permissions to update projects' },
          { status: 403 }
        ));
      }

      const body = await request.json();
      console.log("Received update data for project:", projectId, body);
      const updates: Partial<ProjectFormData> = body;

      const supabase = createServerSupabaseClient();
      const projectService = new ProjectService(supabase);
      const project = await projectService.updateProject(projectId, updates);
      
      console.log("Project updated successfully:", projectId);
      return withCors(NextResponse.json({ project }));
    } catch (error) {
      console.error('Update project error:', error);
      return withCors(NextResponse.json(
        { error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      ));
    }
  },
  {
    roles: ['admin', 'manager'],
    permissions: ['projects:write']
  }
)

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
