// TypeScript types for the project management system

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  description?: string;
  client_name?: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  service_specific: Record<string, any>;
  company_number?: string;
  company_email?: string;
  company_address?: string;
  about_company?: string;
  social_links: string[];
  public_contacts: Record<string, any>;
  media_links: string[];
  bank_details: Record<string, any>;
  payment_integration_needs?: string[];
  confirmed: boolean;
  confirmed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectActivity {
  activity_id: string;
  project_id: string;
  action: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  created_at: string;
  created_by?: string;
}

export type ProjectType = 
  | 'web' 
  | 'branding' 
  | 'ai' 
  | 'marketing' 
  | 'custom';

export type ProjectStatus = 
  | 'planning' 
  | 'active' 
  | 'completed' 
  | 'on-hold' 
  | 'cancelled';

export type ProjectPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface ProjectFormData {
  // Step 1: Core Project Details
  name: string;
  type: ProjectType;
  description?: string;
  client_name?: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  priority: ProjectPriority;

  // Step 2: Conditional Requirements (Dynamic per type)
  service_specific: Record<string, any>;

  // Step 3: Company Info
  company_number?: string;
  company_email?: string;
  company_address?: string;
  about_company?: string;

  // Step 4: Public Contact
  social_links: string[];
  public_contacts: Record<string, any>;

  // Step 5: Media & Payment
  media_links: string[];
  bank_details: Record<string, any>;
}

export interface ProjectStepProps {
  data: Partial<ProjectFormData>;
  onUpdate: (data: Partial<ProjectFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface FileUploadResult {
  path: string;
  url: string;
  size: number;
  type: string;
}

export interface ProjectFilters {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  project_type?: ProjectType[];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}
