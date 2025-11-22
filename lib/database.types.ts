export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          attachment_id: string
          client_visible: boolean | null
          content_type: string | null
          file_name: string
          file_size: number | null
          project_id: string | null
          storage_path: string
          task_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          attachment_id?: string
          client_visible?: boolean | null
          content_type?: string | null
          file_name: string
          file_size?: number | null
          project_id?: string | null
          storage_path: string
          task_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          attachment_id?: string
          client_visible?: boolean | null
          content_type?: string | null
          file_name?: string
          file_size?: number | null
          project_id?: string | null
          storage_path?: string
          task_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          comment_id: string
          created_at: string | null
          created_by: string | null
          file_refs: Json | null
          project_id: string | null
          task_id: string | null
        }
        Insert: {
          body: string
          comment_id?: string
          created_at?: string | null
          created_by?: string | null
          file_refs?: Json | null
          project_id?: string | null
          task_id?: string | null
        }
        Update: {
          body?: string
          comment_id?: string
          created_at?: string | null
          created_by?: string | null
          file_refs?: Json | null
          project_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          contact_email: string | null
          created_at: string | null
          form_data: Json
          form_type: string
          id: string
          logo_files: string[] | null
          media_files: string[] | null
          status: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          form_data: Json
          form_type: string
          id?: string
          logo_files?: string[] | null
          media_files?: string[] | null
          status?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          logo_files?: string[] | null
          media_files?: string[] | null
          status?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          availability: string | null
          cover_letter: string | null
          created_at: string | null
          email: string
          experience_level: string
          full_name: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_files: string[] | null
          portfolio_url: string | null
          position: string
          referral_source: string | null
          resume_url: string | null
          salary: string | null
          status: string | null
        }
        Insert: {
          availability?: string | null
          cover_letter?: string | null
          created_at?: string | null
          email: string
          experience_level: string
          full_name: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_files?: string[] | null
          portfolio_url?: string | null
          position: string
          referral_source?: string | null
          resume_url?: string | null
          salary?: string | null
          status?: string | null
        }
        Update: {
          availability?: string | null
          cover_letter?: string | null
          created_at?: string | null
          email?: string
          experience_level?: string
          full_name?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_files?: string[] | null
          portfolio_url?: string | null
          position?: string
          referral_source?: string | null
          resume_url?: string | null
          salary?: string | null
          status?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string | null
          department: string | null
          description: string | null
          employment_type: string | null
          experience: string | null
          id: string
          is_active: boolean | null
          locations: string[] | null
          requirements: string[] | null
          skills: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          experience?: string | null
          id?: string
          is_active?: boolean | null
          locations?: string[] | null
          requirements?: string[] | null
          skills?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          experience?: string | null
          id?: string
          is_active?: boolean | null
          locations?: string[] | null
          requirements?: string[] | null
          skills?: string[] | null
          title?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          department: string | null
          employment_type: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          manager_id: string | null
          phone: string | null
          position: string | null
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          employment_type?: string | null
          first_name?: string | null
          hire_date?: string | null
          id: string
          last_login_at?: string | null
          last_name?: string | null
          manager_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          employment_type?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          manager_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          about_company: string | null
          bank_details: string | null
          budget: number | null
          business_number: string | null
          client_id: string | null
          client_name: string | null
          company_address: string | null
          company_email: string | null
          created_at: string | null
          created_by_admin: string | null
          description: string | null
          end_date: string | null
          media_links: string | null
          priority: string | null
          project_id: string
          project_name: string
          project_type: string
          public_address: string | null
          public_business_number: string | null
          public_company_email: string | null
          social_media_links: string | null
          start_date: string | null
          status: string | null
          step2_data: Json | null
          uploaded_media: Json | null
        }
        Insert: {
          about_company?: string | null
          bank_details?: string | null
          budget?: number | null
          business_number?: string | null
          client_id?: string | null
          client_name?: string | null
          company_address?: string | null
          company_email?: string | null
          created_at?: string | null
          created_by_admin?: string | null
          description?: string | null
          end_date?: string | null
          media_links?: string | null
          priority?: string | null
          project_id?: string
          project_name: string
          project_type: string
          public_address?: string | null
          public_business_number?: string | null
          public_company_email?: string | null
          social_media_links?: string | null
          start_date?: string | null
          status?: string | null
          step2_data?: Json | null
          uploaded_media?: Json | null
        }
        Update: {
          about_company?: string | null
          bank_details?: string | null
          budget?: number | null
          business_number?: string | null
          client_id?: string | null
          client_name?: string | null
          company_address?: string | null
          company_email?: string | null
          created_at?: string | null
          created_by_admin?: string | null
          description?: string | null
          end_date?: string | null
          media_links?: string | null
          priority?: string | null
          project_id?: string
          project_name?: string
          project_type?: string
          public_address?: string | null
          public_business_number?: string | null
          public_company_email?: string | null
          social_media_links?: string | null
          start_date?: string | null
          status?: string | null
          step2_data?: Json | null
          uploaded_media?: Json | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          about_company: string | null
          approved_at: string | null
          approved_by: string | null
          bank_details: Json | null
          budget: number | null
          business_number: string | null
          client_id: string | null
          client_name: string | null
          company_address: string | null
          company_email: string | null
          confirmation_checked: boolean | null
          created_at: string | null
          description: string | null
          end_date: string | null
          media_links: string | null
          priority: string | null
          project_type: string
          public_address: string | null
          public_business_number: string | null
          public_company_email: string | null
          social_media_links: string | null
          start_date: string | null
          status: string | null
          step2_data: Json | null
          submission_id: string
          uploaded_media: Json | null
        }
        Insert: {
          about_company?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json | null
          budget?: number | null
          business_number?: string | null
          client_id?: string | null
          client_name?: string | null
          company_address?: string | null
          company_email?: string | null
          confirmation_checked?: boolean | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          media_links?: string | null
          priority?: string | null
          project_type: string
          public_address?: string | null
          public_business_number?: string | null
          public_company_email?: string | null
          social_media_links?: string | null
          start_date?: string | null
          status?: string | null
          step2_data?: Json | null
          submission_id?: string
          uploaded_media?: Json | null
        }
        Update: {
          about_company?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json | null
          budget?: number | null
          business_number?: string | null
          client_id?: string | null
          client_name?: string | null
          company_address?: string | null
          company_email?: string | null
          confirmation_checked?: boolean | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          media_links?: string | null
          priority?: string | null
          project_type?: string
          public_address?: string | null
          public_business_number?: string | null
          public_company_email?: string | null
          social_media_links?: string | null
          start_date?: string | null
          status?: string | null
          step2_data?: Json | null
          submission_id?: string
          uploaded_media?: Json | null
        }
        Relationships: []
      }
      task_deliverables: {
        Row: {
          content_type: string | null
          created_at: string | null
          created_by: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_deliverables_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      task_quality_checklist: {
        Row: {
          checked: boolean | null
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          item: string
          task_id: string
        }
        Insert: {
          checked?: boolean | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          item: string
          task_id: string
        }
        Update: {
          checked?: boolean | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          item?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_quality_checklist_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      task_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          reviewer_id: string
          status: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          reviewer_id: string
          status?: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          reviewer_id?: string
          status?: string
          task_id: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      task_work_updates: {
        Row: {
          comment: string
          created_at: string | null
          created_by: string
          id: string
          task_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          created_by: string
          id?: string
          task_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          created_by?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_work_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chat_participant: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: undefined
      }
      api_submit_client_form: {
        Args: { payload: Json }
        Returns: {
          saved_logos: string[]
          saved_media: string[]
          submission_id: string
        }[]
      }
      approve_submission: {
        Args: {
          admin_id: string
          step1_data: Json
          step2_data_override?: Json
          submission_id_param: string
        }
        Returns: string
      }
      auth_users_with_profiles: {
        Args: never
        Returns: {
          created_at: string
          department: string
          email: string
          first_name: string
          id: string
          last_login: string
          last_name: string
          position: string
          role: string
          status: string
        }[]
      }
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      can_add_participant_to_room: {
        Args: { room_uuid: string; target_user_id: string }
        Returns: boolean
      }
      can_create_chat_room: { Args: never; Returns: boolean }
      check_user_can_create_room: { Args: never; Returns: boolean }
      create_project: {
        Args: {
          admin_id: string
          client_id_param: string
          step1_data: Json
          step2_data: Json
          step3_data: Json
          step4_data: Json
          step5_data: Json
        }
        Returns: string
      }
      csv_to_text_array: { Args: { csv_input: string }; Returns: string[] }
      current_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_client_submissions_with_projects: {
        Args: never
        Returns: {
          linked_project: Json
          submission_data: Json
        }[]
      }
      get_pending_submissions: {
        Args: never
        Returns: {
          about_company: string
          bank_details: Json
          budget: number
          business_number: string
          client_id: string
          client_name: string
          company_address: string
          company_email: string
          confirmation_checked: boolean
          contact_email: string
          created_at: string
          description: string
          end_date: string
          media_links: string
          priority: string
          project_type: string
          public_address: string
          public_business_number: string
          public_company_email: string
          social_media_links: string
          start_date: string
          status: string
          step2_data: Json
          submission_id: string
          uploaded_media: Json
        }[]
      }
      get_project_with_team: {
        Args: { project_uuid: string }
        Returns: {
          project_data: Json
          team_members: Json
        }[]
      }
      get_user_permissions: {
        Args: { user_id_param: string }
        Returns: {
          action: string
          permission_name: string
          resource: string
        }[]
      }
      has_permission: {
        Args: { permission_name_param: string; user_id_param: string }
        Returns: boolean
      }
      has_project_access: { Args: { pid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      jsonb_text_array: { Args: { j: Json; key: string }; Returns: string[] }
      log_audit: {
        Args: {
          action_param: string
          new_values_param?: Json
          old_values_param?: Json
          resource_id_param: string
          resource_type_param: string
        }
        Returns: string
      }
      no_empty_texts: { Args: { arr: string[] }; Returns: boolean }
      reject_submission: {
        Args: { admin_id: string; submission_id_param: string }
        Returns: boolean
      }
      sync_client_submission_to_project: {
        Args: { project_id: string; submission_id: string }
        Returns: undefined
      }
      test_auth_uid: { Args: never; Returns: string }
      user_can_view_chat_room: { Args: { room_uuid: string }; Returns: boolean }
      user_is_participant_in_room: {
        Args: { room_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_permission:
        | "projects.manage"
        | "projects.delete"
        | "tasks.delete"
        | "attachments.write"
        | "comments.delete"
      app_role: "admin" | "manager" | "employee" | "client"
      service_type:
        | "web-development"
        | "branding-design"
        | "digital-marketing"
        | "ai-solutions"
        | "other"
      submission_status:
        | "received"
        | "in_review"
        | "in_progress"
        | "completed"
        | "archived"
        | "rejected"
      unified_service_type:
        | "web-development"
        | "branding-design"
        | "digital-marketing"
        | "ai-solutions"
        | "custom"
      unified_submission_status:
        | "received"
        | "in_review"
        | "in_progress"
        | "completed"
        | "archived"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_permission: [
        "projects.manage",
        "projects.delete",
        "tasks.delete",
        "attachments.write",
        "comments.delete",
      ],
      app_role: ["admin", "manager", "employee", "client"],
      service_type: [
        "web-development",
        "branding-design",
        "digital-marketing",
        "ai-solutions",
        "other",
      ],
      submission_status: [
        "received",
        "in_review",
        "in_progress",
        "completed",
        "archived",
        "rejected",
      ],
      unified_service_type: [
        "web-development",
        "branding-design",
        "digital-marketing",
        "ai-solutions",
        "custom",
      ],
      unified_submission_status: [
        "received",
        "in_review",
        "in_progress",
        "completed",
        "archived",
        "rejected",
      ],
    },
  },
} as const

