-- Updated Database Schema for Project Submission System
-- This schema supports both client submissions and direct admin project creation

-- Create submissions table (client-submitted, pending approval)
CREATE TABLE IF NOT EXISTS submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_type TEXT NOT NULL, -- Step 1: Type (determines Step 2 path)
    description TEXT, -- Step 1: Optional project overview
    client_name TEXT, -- Step 1: Optional name
    budget NUMERIC DEFAULT 0, -- Step 1
    start_date DATE, -- Step 1
    end_date DATE, -- Step 1
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    step2_data JSONB, -- Conditional fields based on project_type
    business_number TEXT, -- Step 3
    company_email TEXT, -- Step 3
    company_address TEXT, -- Step 3
    about_company TEXT, -- Step 3
    social_media_links TEXT, -- Step 4
    public_business_number TEXT, -- Step 4
    public_company_email TEXT, -- Step 4
    public_address TEXT, -- Step 4
    media_links TEXT, -- Step 5
    uploaded_media JSONB, -- Step 5: File metadata
    bank_details TEXT, -- Step 5
    confirmation_checked BOOLEAN DEFAULT false, -- Step 6
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id)
);

-- Create projects table (finalized, admin-only)
CREATE TABLE IF NOT EXISTS projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL, -- Step 1 (admin-only)
    project_type TEXT NOT NULL, -- Step 1
    description TEXT, -- Step 1
    client_name TEXT, -- Step 1
    budget NUMERIC DEFAULT 0, -- Step 1
    start_date DATE, -- Step 1
    end_date DATE, -- Step 1
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'on-hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    step2_data JSONB, -- Copied from submission
    business_number TEXT, -- Step 3
    company_email TEXT, -- Step 3
    company_address TEXT, -- Step 3
    about_company TEXT, -- Step 3
    social_media_links TEXT, -- Step 4
    public_business_number TEXT, -- Step 4
    public_company_email TEXT, -- Step 4
    public_address TEXT, -- Step 4
    media_links TEXT, -- Step 5
    uploaded_media JSONB, -- Step 5
    bank_details TEXT, -- Step 5
    created_by_admin UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_members table (for team assignments)
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'lead')),
    PRIMARY KEY (project_id, user_id)
);

-- Create tasks table (for project tasks)
CREATE TABLE IF NOT EXISTS tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assignee_id UUID REFERENCES auth.users(id),
    due_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attachments table (for project files)
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    content_type TEXT,
    version INTEGER DEFAULT 1,
    client_visible BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table (for project discussions)
CREATE TABLE IF NOT EXISTS comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    file_refs JSONB, -- References to attachments
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for submissions table
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Clients can insert their own submissions
CREATE POLICY "Clients can insert their own submissions" ON submissions
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Clients can view their own submissions
CREATE POLICY "Clients can view their own submissions" ON submissions
    FOR SELECT USING (auth.uid() = client_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can update submissions (for approval/rejection)
CREATE POLICY "Only admins can update submissions" ON submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete submissions
CREATE POLICY "Only admins can delete submissions" ON submissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Only admins can insert projects
CREATE POLICY "Only admins can insert projects" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can view projects
CREATE POLICY "Only admins can view projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can update projects
CREATE POLICY "Only admins can update projects" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete projects
CREATE POLICY "Only admins can delete projects" ON projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for project_members table
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Admins can manage all project members
CREATE POLICY "Admins can manage project members" ON project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Members can view their own project assignments
CREATE POLICY "Members can view their own assignments" ON project_members
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admins can manage all tasks
CREATE POLICY "Admins can manage all tasks" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Members can view tasks assigned to them
CREATE POLICY "Members can view assigned tasks" ON tasks
    FOR SELECT USING (auth.uid() = assignee_id);

-- Members can update their own tasks
CREATE POLICY "Members can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = assignee_id);

-- RLS Policies for attachments table
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all attachments
CREATE POLICY "Admins can manage all attachments" ON attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Members can view client-visible attachments
CREATE POLICY "Members can view client-visible attachments" ON attachments
    FOR SELECT USING (client_visible = true);

-- RLS Policies for comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all comments
CREATE POLICY "Admins can manage all comments" ON comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Members can view and create comments
CREATE POLICY "Members can view and create comments" ON comments
    FOR ALL USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM project_members pm
            JOIN projects p ON pm.project_id = p.project_id
            WHERE pm.user_id = auth.uid() 
            AND p.project_id = comments.project_id
        )
    );
