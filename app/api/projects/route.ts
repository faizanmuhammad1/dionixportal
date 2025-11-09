import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { projectService } from '@/lib/project-service';
import { ProjectFormData } from '@/lib/types/project';
import { withAuth, withCors } from '@/lib/api-middleware';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(
  async ({ user, request }) => {
    try {
      const supabase = createServerSupabaseClient();
      const userRole = user.role;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.split(',');
    const priority = searchParams.get('priority')?.split(',');
    const project_type = searchParams.get('project_type')?.split(',');
    const search = searchParams.get('search');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (userRole === 'employee') {
      // Employees only see projects they're assigned to
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      
      const projectIds = memberProjects?.map(m => m.project_id) || [];
      
      if (projectIds.length === 0) {
        // No projects assigned to this employee
        return withCors(NextResponse.json({ projects: [] }));
      }
      
      query = query.in('project_id', projectIds);
    } else if (userRole === 'client') {
      // Clients only see their own projects
      query = query.eq('client_id', user.id);
    }
    // Admins and managers see all projects (no additional filter needed)

    // Apply other filters
    if (status && status.length > 0) {
      query = query.in('status', status);
    }
    if (priority && priority.length > 0) {
      query = query.in('priority', priority);
    }
    if (project_type && project_type.length > 0) {
      query = query.in('project_type', project_type);
    }
    if (search) {
      query = query.or(`project_name.ilike.%${search}%,client_name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (start_date && end_date) {
      query = query
        .gte('created_at', start_date)
        .lte('created_at', end_date);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
      const response = withCors(NextResponse.json({ projects: projects || [] }));
      // Add cache headers for GET requests
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return response;
    } catch (error) {
      console.error('Get projects error:', error);
      return withCors(NextResponse.json(
        { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      ));
    }
  },
  {
    roles: ['admin', 'manager', 'employee', 'client'],
    permissions: ['projects:read']
  }
)

export const POST = withAuth(
  async ({ user, request }) => {
    try {
      const body = await request.json();
      const projectData: ProjectFormData = body;

      // Validate required fields
      if (!projectData.name || !projectData.type) {
        return withCors(NextResponse.json(
          { error: 'Project name and type are required' },
          { status: 400 }
        ));
      }

      // Only admins and managers can create projects
      if (user.role !== 'admin' && user.role !== 'manager') {
        return withCors(NextResponse.json(
          { error: 'Insufficient permissions to create projects' },
          { status: 403 }
        ));
      }

      const project = await projectService.createProject(projectData);
      
      return withCors(NextResponse.json({ project }, { status: 201 }));
    } catch (error) {
      console.error('Create project error:', error);
      return withCors(NextResponse.json(
        { error: 'Failed to create project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      ));
    }
  },
  {
    roles: ['admin', 'manager'],
    permissions: ['projects:write']
  }
)
