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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.split(',');
    const priority = searchParams.get('priority')?.split(',');
    const project_type = searchParams.get('project_type')?.split(',');
    const search = searchParams.get('search');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const filters = {
      status: status?.length ? status : undefined,
      priority: priority?.length ? priority : undefined,
      project_type: project_type?.length ? project_type : undefined,
      search: search || undefined,
      date_range: start_date && end_date ? { start: start_date, end: end_date } : undefined,
    };

    const projects = await projectService.getUserProjects(filters);
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
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
