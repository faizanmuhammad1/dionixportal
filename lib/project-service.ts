import { createClient } from './supabase';
import { createServerSupabaseClient } from './supabase-server';
import { Project, ProjectActivity, ProjectFormData, ProjectFilters } from './types/project';
import { uploadProjectFile, createSignedUrl, removeProjectFile } from './storage';

export class ProjectService {
  private supabase = createClient();
  
  constructor(supabaseClient?: any) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    }
  }

  // Normalize legacy step2_data keys (snake_case) to new camelCase keys
  private normalizeServiceSpecific(raw: any): Record<string, any> {
    const input = raw || {};
    if (typeof input !== 'object' || Array.isArray(input)) return {};

    const mapPairs: Array<[string, string]> = [
      // Web Development
      ['domain_suggestions', 'domainSuggestions'],
      ['website_references', 'websiteReferences'],
      ['features_requirements', 'featuresRequirements'],
      ['budget_timeline', 'budgetTimeline'],
      ['additional_requirements', 'additional_requirements'], // keep as-is for legacy display
      // Branding & Design
      ['logo_ideas_concepts', 'logoIdeasConcepts'],
      ['color_brand_theme', 'colorBrandTheme'],
      ['design_assets_needed', 'designAssetsNeeded'],
      ['target_audience_industry', 'targetAudienceIndustry'],
      // AI Solutions
      ['ai_solution_type', 'aiSolutionType'],
      ['business_challenge_use_case', 'businessChallengeUseCase'],
      ['data_availability', 'dataAvailability'],
      ['expected_outcome', 'expectedOutcome'],
      ['budget_range', 'budgetRange'],
      // Digital Marketing
      ['marketing_goals', 'marketingGoals'],
      ['channels_of_interest', 'channelsOfInterest'],
      ['monthly_budget_range', 'budgetRangeMonthly'],
      // Custom / Other
      ['service_description', 'serviceDescription'],
    ];

    const result: Record<string, any> = { ...input };
    for (const [snake, camel] of mapPairs) {
      if (result[camel] === undefined && result[snake] !== undefined) {
        result[camel] = result[snake];
      }
    }
    return result;
  }

  // For writes: include both camelCase and snake_case keys to be backward compatible
  private duplicateKeysForDb(serviceSpecific: Record<string, any> | undefined): Record<string, any> {
    const src = serviceSpecific || {};
    const pairs: Array<[string, string]> = [
      // Web Development
      ['domainSuggestions', 'domain_suggestions'],
      ['websiteReferences', 'website_references'],
      ['featuresRequirements', 'features_requirements'],
      ['budgetTimeline', 'budget_timeline'],
      ['additional_requirements', 'additional_requirements'],
      // Branding & Design
      ['logoIdeasConcepts', 'logo_ideas_concepts'],
      ['colorBrandTheme', 'color_brand_theme'],
      ['designAssetsNeeded', 'design_assets_needed'],
      ['targetAudienceIndustry', 'target_audience_industry'],
      // AI Solutions
      ['aiSolutionType', 'ai_solution_type'],
      ['businessChallengeUseCase', 'business_challenge_use_case'],
      ['dataAvailability', 'data_availability'],
      ['expectedOutcome', 'expected_outcome'],
      ['budgetRange', 'budget_range'],
      // Digital Marketing
      ['marketingGoals', 'marketing_goals'],
      ['channelsOfInterest', 'channels_of_interest'],
      ['budgetRangeMonthly', 'monthly_budget_range'],
      // Custom / Other
      ['serviceDescription', 'service_description'],
    ];

    const out: Record<string, any> = { ...src };
    for (const [camel, snake] of pairs) {
      if (src[camel] !== undefined && out[snake] === undefined) {
        out[snake] = src[camel];
      }
    }
    return out;
  }

  private mapProjectRow(row: any): Project {
    // Normalize DB row (projects table) to API shape used by UI types
    const publicContacts: Record<string, any> | null =
      row.public_business_number || row.public_company_email || row.public_address
        ? {
            phone: row.public_business_number || undefined,
            email: row.public_company_email || undefined,
            address: row.public_address || undefined,
          }
        : null;

    const socialLinks = typeof row.social_media_links === 'string'
      ? row.social_media_links.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(row.social_media_links)
        ? row.social_media_links
        : [];

    const mediaLinks = typeof row.media_links === 'string'
      ? row.media_links.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(row.media_links)
        ? row.media_links
        : [];

    let bankDetails: any = row.bank_details;
    if (bankDetails && typeof bankDetails === 'string') {
      try { bankDetails = JSON.parse(bankDetails); } catch { /* leave as string */ }
    }

    return {
      id: row.project_id ?? row.id,
      name: row.project_name ?? row.name,
      type: row.project_type ?? row.type,
      description: row.description ?? undefined,
      client_name: row.client_name ?? undefined,
      budget: row.budget ?? 0,
      start_date: row.start_date ?? undefined,
      end_date: row.end_date ?? undefined,
      status: row.status,
      priority: row.priority,
      service_specific: this.normalizeServiceSpecific(row.step2_data ?? row.service_specific ?? {}),
      company_number: row.business_number ?? row.company_number ?? undefined,
      company_email: row.company_email ?? undefined,
      company_address: row.company_address ?? undefined,
      about_company: row.about_company ?? undefined,
      social_links: socialLinks,
      public_contacts: publicContacts ?? undefined,
      media_links: mediaLinks,
      bank_details: bankDetails ?? undefined,
      created_by: row.created_by ?? row.created_by_admin ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.updated_at,
      confirmed: row.confirmed ?? false,
      confirmed_at: row.confirmed_at ?? undefined,
    } as unknown as Project;
  }

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

      // Note: file upload handling is not supported in this path currently

      // Prepare project data for database (match projects table columns)
      const dbProjectData: any = {
        project_name: projectData.name,
        project_type: projectData.type,
        description: projectData.description,
        client_name: projectData.client_name,
        budget: projectData.budget,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        status: projectData.status,
        priority: projectData.priority,
        step2_data: this.duplicateKeysForDb(projectData.service_specific as any),
        business_number: projectData.company_number,
        company_email: projectData.company_email,
        company_address: projectData.company_address,
        about_company: projectData.about_company,
        social_media_links: Array.isArray(projectData.social_links)
          ? projectData.social_links.join(',')
          : projectData.social_links,
        public_business_number: projectData.public_contacts?.phone,
        public_company_email: projectData.public_contacts?.email,
        public_address: projectData.public_contacts?.address,
        media_links: Array.isArray(projectData.media_links)
          ? projectData.media_links.join(',')
          : projectData.media_links,
        bank_details: typeof projectData.bank_details === 'string'
          ? projectData.bank_details
          : projectData.bank_details
            ? JSON.stringify(projectData.bank_details)
            : null,
        created_by_admin: user.id,
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

      // No post-insert file updates needed

      return this.mapProjectRow(data);
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async listComments(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}/comments`, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Failed to load comments");
    const json = await res.json();
    return json.comments as any[];
  }

  async addComment(projectId: string, payload: { body: string; task_id?: string; file_refs?: any }) {
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Failed to create comment: ${err || res.status}`);
    }
    const json = await res.json();
    return json.comment as any;
  }

  async listAttachments(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}/attachments`, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Failed to load attachments");
    const json = await res.json();
    return json.attachments as any[];
  }

  async addAttachment(projectId: string, payload: { storage_path: string; file_name: string; file_size?: number; content_type?: string; task_id?: string; client_visible?: boolean }) {
    const res = await fetch(`/api/projects/${projectId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Failed to create attachment: ${err || res.status}`);
    }
    const json = await res.json();
    return json.attachment as any;
  }

  async deleteAttachment(projectId: string, attachmentId: string) {
    const res = await fetch(`/api/projects/${projectId}/attachments?attachment_id=${encodeURIComponent(attachmentId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Failed to delete attachment");
    return true;
  }

  async deleteComment(projectId: string, commentId: string) {
    const res = await fetch(`/api/projects/${projectId}/comments?comment_id=${encodeURIComponent(commentId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Failed to delete comment");
    return true;
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
        .eq('project_id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Project not found
        }
        throw new Error(`Get project failed: ${error.message}`);
      }

      return this.mapProjectRow(data);
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

      return (data || []).map((row: any) => this.mapProjectRow(row));
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

      // Note: file upload handling is not supported in this path currently

      // Prepare update data
      const updateData: any = {};
      
      if (updates.name) updateData.project_name = updates.name;
      if (updates.type) updateData.project_type = updates.type;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.client_name !== undefined) updateData.client_name = updates.client_name;
      if (updates.budget !== undefined) updateData.budget = updates.budget;
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.status) updateData.status = updates.status;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.service_specific) updateData.step2_data = this.duplicateKeysForDb(updates.service_specific as any);
      if (updates.company_number !== undefined) updateData.business_number = updates.company_number;
      if (updates.company_email !== undefined) updateData.company_email = updates.company_email;
      if (updates.company_address !== undefined) updateData.company_address = updates.company_address;
      if (updates.about_company !== undefined) updateData.about_company = updates.about_company;
      if (updates.social_links) updateData.social_media_links = Array.isArray(updates.social_links) ? updates.social_links.join(',') : updates.social_links;
      if (updates.public_contacts) {
        if (updates.public_contacts.phone !== undefined) updateData.public_business_number = updates.public_contacts.phone;
        if (updates.public_contacts.email !== undefined) updateData.public_company_email = updates.public_contacts.email;
        if (updates.public_contacts.address !== undefined) updateData.public_address = updates.public_contacts.address;
      }
      if (updates.media_links) updateData.media_links = Array.isArray(updates.media_links) ? updates.media_links.join(',') : updates.media_links;
      if (updates.bank_details) updateData.bank_details = typeof updates.bank_details === 'string' ? updates.bank_details : JSON.stringify(updates.bank_details);

      // Update project
      const { data, error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        throw new Error(`Update project failed: ${error.message}`);
      }

      return this.mapProjectRow(data);
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
      console.log(`Starting deletion of project ${projectId}`);

      // First, get all attachments for this project to delete files from storage
      const { data: attachments, error: attachmentsError } = await this.supabase
        .from('attachments')
        .select('storage_path, file_name')
        .eq('project_id', projectId);

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
        // Continue with project deletion even if we can't fetch attachments
      } else if (attachments && attachments.length > 0) {
        console.log(`Found ${attachments.length} attachments to delete from storage`);
        
        // Delete files from Supabase Storage
        for (const attachment of attachments) {
          try {
            if (attachment.storage_path) {
              const { error: storageError } = await this.supabase.storage
                .from('project-files')
                .remove([attachment.storage_path]);
              
              if (storageError) {
                console.error(`Failed to delete file ${attachment.storage_path}:`, storageError);
              } else {
                console.log(`Deleted file: ${attachment.file_name}`);
              }
            }
          } catch (fileError) {
            console.error(`Error deleting file ${attachment.file_name}:`, fileError);
          }
        }
      }

      // Delete project (comments and attachments will be deleted automatically due to CASCADE)
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        throw new Error(`Delete project failed: ${error.message}`);
      }

      console.log(`Project ${projectId} deleted successfully`);
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
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        throw new Error(`Confirm project failed: ${error.message}`);
      }

      return this.mapProjectRow(data);
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
        .select(`*`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Get project activities failed: ${error.message}`);
      }

      return (data as unknown as ProjectActivity[]) || [];
    } catch (error) {
      console.error('Get project activities error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const projectService = new ProjectService();
