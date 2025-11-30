import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { ProjectService } from '@/lib/project-service';
import { ProjectFormData } from '@/lib/types/project';
import { withAuth, withCors } from '@/lib/api-middleware';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const supabase = createServerSupabaseClient();
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const projectId = routeParams?.params?.id || resolvedParams.params.id;

      if (!projectId) {
        return withCors(NextResponse.json({ error: 'Project ID is required' }, { status: 400 }));
      }

      // For employees, use admin client to bypass RLS for both project and membership checks
      // Authorization is already handled by withAuth middleware
      const dbClient = (user.role === 'employee' || user.role === 'client') 
        ? createAdminSupabaseClient() 
        : supabase;

      // Check access first for employees/clients before fetching project
      if (user.role === 'employee') {
        const adminSupabase = createAdminSupabaseClient();
        const { data: membership, error: membershipError } = await adminSupabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (membershipError) {
          console.error('Error checking project membership:', membershipError);
          return withCors(NextResponse.json(
            { error: 'Failed to verify project access', details: membershipError.message },
            { status: 500 }
          ));
        }

        if (!membership) {
          console.log(`Employee ${user.id} attempted to access project ${projectId} but is not a member`);
          return withCors(NextResponse.json(
            { error: 'You do not have access to this project' },
            { status: 403 }
          ));
        }
      }

      // Get the project using appropriate client
      const { data: project, error } = await dbClient
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !project) {
        console.error('Error fetching project:', error);
        return withCors(NextResponse.json({ error: 'Project not found' }, { status: 404 }));
      }

      // Debug logging for step2_data
      console.log('Backend: Project fetched for employee:', {
        project_id: project.project_id,
        project_name: project.project_name,
        project_type: project.project_type,
        has_step2_data: !!project.step2_data,
        step2_data_type: typeof project.step2_data,
        step2_data_value: project.step2_data,
        step2_data_keys: project.step2_data && typeof project.step2_data === 'object' 
          ? Object.keys(project.step2_data) 
          : 'not an object',
        has_service_specific: !!project.service_specific,
        service_specific_type: typeof project.service_specific,
        all_step_service_fields: Object.keys(project).filter(k => 
          k.includes('step') || k.includes('service') || k.includes('type')
        ),
      });

      // Additional check for clients
      if (user.role === 'client') {
        // Clients can only see their own projects
        if (project.client_id !== user.id) {
          console.log(`Client ${user.id} attempted to access project ${projectId} but client_id is ${project.client_id}`);
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

      // Use admin client for updates to ensure we can write to all tables/fields
      // and bypass any strict RLS that might be blocking updates to related tables
      const supabase = createAdminSupabaseClient();
      const projectService = new ProjectService(supabase, true); // Skip auth check since we validated in middleware
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
      
      // Use admin client to bypass RLS for delete operations
      const adminSupabase = createAdminSupabaseClient();
      const { data: projectInfo } = await adminSupabase
        .from('projects')
        .select('project_name, project_id')
        .eq('project_id', params.id)
        .single();
      
      const projectName = projectInfo?.project_name || 'Unknown Project';
      console.log(`Deleting project: ${projectName} (${params.id})`);
      
      // Create ProjectService with admin Supabase client to bypass RLS
      const serverProjectService = new ProjectService(adminSupabase, true);
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
