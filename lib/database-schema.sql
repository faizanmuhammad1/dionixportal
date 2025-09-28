-- Database Schema for Project Management System
-- This file contains the complete database schema for the project management system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create projects table
CREATE TABLE projects (
    -- 🔑 Primary Key
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 📝 Step 1: Core Project Details
    project_name VARCHAR(255) NOT NULL CHECK (char_length(project_name) > 2),
    project_type VARCHAR(50) NOT NULL CHECK (
        project_type IN ('Web Development', 'Branding Design', 'AI Solutions', 'Digital Marketing', 'Custom Project')
    ),
    description TEXT,
    client_name VARCHAR(255),
    budget NUMERIC(12,2) DEFAULT 0 CHECK (budget >= 0),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Planning' CHECK (
        status IN ('Planning','In Progress','On Hold','Completed','Cancelled')
    ),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (
        priority IN ('Low','Medium','High','Critical')
    ),

    -- 🎯 Step 2: Conditional Requirements (Dynamic per type)
    project_details JSONB DEFAULT '{}'::jsonb,

    -- 🏢 Step 3: Company Info
    business_number VARCHAR(100),
    company_email CITEXT,
    company_address TEXT,
    about_company TEXT,

    -- 🌐 Step 4: Public Contact
    social_media_links JSONB DEFAULT '[]'::jsonb, -- store as ["https://x.com/abc","https://linkedin.com/xyz"]
    public_business_number VARCHAR(100),
    public_company_email CITEXT,
    public_company_address TEXT,

    -- 🖼️💳 Step 5: Media & Payment
    media_links JSONB DEFAULT '[]'::jsonb, -- external hosted URLs
    uploaded_files TEXT[] DEFAULT '{}',    -- supabase storage paths
    bank_details TEXT,

    -- ✅ Step 6: Confirmation
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- 🧑 Auth Integration
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- ⚙️ System Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_activities table for audit trail
CREATE TABLE project_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    action VARCHAR(100), -- e.g. "Created", "Updated Budget", "Confirmed"
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_projects_submitted_by ON projects(submitted_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX idx_project_activities_created_at ON project_activities(created_at);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Users can insert their own projects"
ON projects
FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own projects"
ON projects
FOR UPDATE USING (auth.uid() = submitted_by);

CREATE POLICY "Users can delete their own projects"
ON projects
FOR DELETE USING (auth.uid() = submitted_by);

-- RLS Policies for project_activities table
CREATE POLICY "Users can see activities for their projects"
ON project_activities
FOR SELECT USING (
    auth.uid() IN (
        SELECT submitted_by FROM projects WHERE projects.project_id = project_activities.project_id
    )
);

CREATE POLICY "Users can insert activities for their projects"
ON project_activities
FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT submitted_by FROM projects WHERE projects.project_id = project_activities.project_id
    )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to log project activities
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO project_activities (project_id, action, new_value, created_by)
        VALUES (NEW.project_id, 'Created', row_to_json(NEW), NEW.submitted_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO project_activities (project_id, action, old_value, new_value, created_by)
        VALUES (NEW.project_id, 'Updated', row_to_json(OLD), row_to_json(NEW), NEW.submitted_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO project_activities (project_id, action, old_value, created_by)
        VALUES (OLD.project_id, 'Deleted', row_to_json(OLD), OLD.submitted_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to log project activities
CREATE TRIGGER log_projects_activity
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION log_project_activity();
