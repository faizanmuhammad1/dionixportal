import { createClient } from './supabase';
import { createServerSupabaseClient } from './supabase-server';
import { Project, ProjectActivity, ProjectFormData, ProjectFilters } from './types/project';
import { uploadProjectFile, createSignedUrl, removeProjectFile } from './storage';

export class ProjectService {
  private supabase = createClient();

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectFormData): Promise<Project> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Handle file uploads if any
      let uploadedFilePaths: string[] = [];
      if (projectData.uploaded_files && projectData.uploaded_files.length > 0) {
        const uploadResults = await Promise.all(
          projectData.uploaded_files.map(file => 
            uploadProjectFile({
              projectId: 'temp-project-id',
              file,
              path: 'uploads'
            })
          )
        );
        uploadedFilePaths = uploadResults.map(result => result.path);
      }

      // Prepare project data for database
      const dbProjectData = {
        name: projectData.name,
        type: projectData.type,
        description: projectData.description,
        client_name: projectData.client_name,
        budget: projectData.budget,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        status: projectData.status,
        priority: projectData.priority,
        service_specific: projectData.service_specific,
        company_number: projectData.company_number,
        company_email: projectData.company_email,
        company_address: projectData.company_address,
        about_company: projectData.about_company,
        social_links: projectData.social_links,
        public_contacts: projectData.public_contacts,
        media_links: projectData.media_links,
        bank_details: projectData.bank_details,
        created_by: user.id
      };

      // Insert project into database
      const { data, error } = await this.supabase
        .from('projects')
        .insert(dbProjectData)
        .select()
        .single();

      if (error) {
        throw new Error(`Project creation failed: ${error.message}`);
      }

      // If we have uploaded files, update the project with correct paths
      if (uploadedFilePaths.length > 0) {
        const updatedPaths = uploadedFilePaths.map(path => 
          path.replace('temp-project-id', data.project_id)
        );
        
        await this.supabase
          .from('projects')
          .update({ uploaded_files: updatedPaths })
          .eq('project_id', data.project_id);
      }

      return data;
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:auth.users!created_by(email)
        `)
        .eq('id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Project not found
        }
        throw new Error(`Get project failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Get project error:', error);
      throw error;
    }
  }

  /**
   * Get all projects for the current user
   */
  async getUserProjects(filters?: ProjectFilters): Promise<Project[]> {
    try {
      let query = this.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:auth.users!created_by(email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        if (filters.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }
        if (filters.project_type && filters.project_type.length > 0) {
          query = query.in('type', filters.project_type);
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        if (filters.date_range) {
          query = query
            .gte('created_at', filters.date_range.start)
            .lte('created_at', filters.date_range.end);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Get user projects failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get user projects error:', error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, updates: Partial<ProjectFormData>): Promise<Project> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Handle file uploads if any
      let uploadedFilePaths: string[] = [];
      if (updates.uploaded_files && updates.uploaded_files.length > 0) {
        const uploadResults = await Promise.all(
          updates.uploaded_files.map(file => 
            uploadProjectFile({
              projectId,
              file,
              path: 'uploads'
            })
          )
        );
        uploadedFilePaths = uploadResults.map(result => result.path);
      }

      // Prepare update data
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.client_name !== undefined) updateData.client_name = updates.client_name;
      if (updates.budget !== undefined) updateData.budget = updates.budget;
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.status) updateData.status = updates.status;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.service_specific) updateData.service_specific = updates.service_specific;
      if (updates.company_number !== undefined) updateData.company_number = updates.company_number;
      if (updates.company_email !== undefined) updateData.company_email = updates.company_email;
      if (updates.company_address !== undefined) updateData.company_address = updates.company_address;
      if (updates.about_company !== undefined) updateData.about_company = updates.about_company;
      if (updates.social_links) updateData.social_links = updates.social_links;
      if (updates.public_contacts) updateData.public_contacts = updates.public_contacts;
      if (updates.media_links) updateData.media_links = updates.media_links;
      if (updates.bank_details) updateData.bank_details = updates.bank_details;

      // Update project
      const { data, error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        throw new Error(`Update project failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get project to delete associated files
      const project = await this.getProject(projectId);
      if (project && project.media_links.length > 0) {
        // Note: In the new schema, we store media as links, not file paths
        // File cleanup would need to be handled differently
      }

      // Delete project (activities will be deleted automatically due to CASCADE)
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        throw new Error(`Delete project failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  /**
   * Confirm a project
   */
  async confirmProject(projectId: string): Promise<Project> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .update({ 
          confirmed: true, 
          confirmed_at: new Date().toISOString() 
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        throw new Error(`Confirm project failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Confirm project error:', error);
      throw error;
    }
  }

  /**
   * Get project activities
   */
  async getProjectActivities(projectId: string): Promise<ProjectActivity[]> {
    try {
      const { data, error } = await this.supabase
        .from('project_activities')
        .select(`
          *,
          created_by_user:auth.users!created_by(email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Get project activities failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get project activities error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const projectService = new ProjectService();
