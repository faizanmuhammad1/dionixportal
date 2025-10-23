import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { projectService } from '@/lib/project-service';
import { ProjectFormData } from '@/lib/types/project';

export async function GET(request: NextRequest) {
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
        return NextResponse.json({ projects: [] });
      }
      
      query = query.in('project_id', projectIds);
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
    
    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const projectData: ProjectFormData = body;

    // Validate required fields
    if (!projectData.name || !projectData.type) {
      return NextResponse.json(
        { error: 'Project name and type are required' },
        { status: 400 }
      );
    }

    const project = await projectService.createProject(projectData);
    
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
