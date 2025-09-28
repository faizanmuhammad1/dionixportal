-- RPC Functions for Project Submission System

-- Function to approve a submission and create a project
CREATE OR REPLACE FUNCTION approve_submission(
    submission_id_param UUID,
    step1_data JSONB,
    admin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    submission_record submissions%ROWTYPE;
    new_project_id UUID;
BEGIN
    -- Fetch the submission
    SELECT * INTO submission_record
    FROM submissions
    WHERE submission_id = submission_id_param
    AND status = 'pending';
    
    -- Check if submission exists and is pending
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found or not pending';
    END IF;
    
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = admin_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;
    
    -- Create new project
    INSERT INTO projects (
        client_id,
        project_name,
        project_type,
        description,
        client_name,
        budget,
        start_date,
        end_date,
        status,
        priority,
        step2_data,
        business_number,
        company_email,
        company_address,
        about_company,
        social_media_links,
        public_business_number,
        public_company_email,
        public_address,
        media_links,
        uploaded_media,
        bank_details,
        created_by_admin
    ) VALUES (
        submission_record.client_id,
        step1_data->>'project_name',
        submission_record.project_type,
        COALESCE(step1_data->>'description', submission_record.description),
        COALESCE(step1_data->>'client_name', submission_record.client_name),
        COALESCE((step1_data->>'budget')::NUMERIC, submission_record.budget),
        COALESCE((step1_data->>'start_date')::DATE, submission_record.start_date),
        COALESCE((step1_data->>'end_date')::DATE, submission_record.end_date),
        COALESCE(step1_data->>'status', 'planning'),
        COALESCE(step1_data->>'priority', submission_record.priority),
        submission_record.step2_data,
        submission_record.business_number,
        submission_record.company_email,
        submission_record.company_address,
        submission_record.about_company,
        submission_record.social_media_links,
        submission_record.public_business_number,
        submission_record.public_company_email,
        submission_record.public_address,
        submission_record.media_links,
        submission_record.uploaded_media,
        submission_record.bank_details,
        admin_id
    ) RETURNING project_id INTO new_project_id;
    
    -- Update submission status
    UPDATE submissions
    SET 
        status = 'approved',
        approved_at = NOW(),
        approved_by = admin_id
    WHERE submission_id = submission_id_param;
    
    RETURN new_project_id;
END;
$$;

-- Function to create a project directly (admin-only)
CREATE OR REPLACE FUNCTION create_project(
    client_id_param UUID,
    step1_data JSONB,
    step2_data JSONB,
    step3_data JSONB,
    step4_data JSONB,
    step5_data JSONB,
    admin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_project_id UUID;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = admin_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;
    
    -- Create new project
    INSERT INTO projects (
        client_id,
        project_name,
        project_type,
        description,
        client_name,
        budget,
        start_date,
        end_date,
        status,
        priority,
        step2_data,
        business_number,
        company_email,
        company_address,
        about_company,
        social_media_links,
        public_business_number,
        public_company_email,
        public_address,
        media_links,
        uploaded_media,
        bank_details,
        created_by_admin
    ) VALUES (
        client_id_param,
        step1_data->>'project_name',
        step1_data->>'project_type',
        step1_data->>'description',
        step1_data->>'client_name',
        COALESCE((step1_data->>'budget')::NUMERIC, 0),
        (step1_data->>'start_date')::DATE,
        (step1_data->>'end_date')::DATE,
        COALESCE(step1_data->>'status', 'planning'),
        COALESCE(step1_data->>'priority', 'medium'),
        step2_data,
        step3_data->>'business_number',
        step3_data->>'company_email',
        step3_data->>'company_address',
        step3_data->>'about_company',
        step4_data->>'social_media_links',
        step4_data->>'public_business_number',
        step4_data->>'public_company_email',
        step4_data->>'public_address',
        step5_data->>'media_links',
        step5_data->'uploaded_media',
        step5_data->>'bank_details',
        admin_id
    ) RETURNING project_id INTO new_project_id;
    
    RETURN new_project_id;
END;
$$;

-- Function to get submissions for admin review
CREATE OR REPLACE FUNCTION get_pending_submissions()
RETURNS TABLE (
    submission_id UUID,
    client_id UUID,
    project_type TEXT,
    description TEXT,
    client_name TEXT,
    budget NUMERIC,
    start_date DATE,
    end_date DATE,
    priority TEXT,
    step2_data JSONB,
    business_number TEXT,
    company_email TEXT,
    company_address TEXT,
    about_company TEXT,
    social_media_links TEXT,
    public_business_number TEXT,
    public_company_email TEXT,
    public_address TEXT,
    media_links TEXT,
    uploaded_media JSONB,
    bank_details TEXT,
    confirmation_checked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;
    
    RETURN QUERY
    SELECT 
        s.submission_id,
        s.client_id,
        s.project_type,
        s.description,
        s.client_name,
        s.budget,
        s.start_date,
        s.end_date,
        s.priority,
        s.step2_data,
        s.business_number,
        s.company_email,
        s.company_address,
        s.about_company,
        s.social_media_links,
        s.public_business_number,
        s.public_company_email,
        s.public_address,
        s.media_links,
        s.uploaded_media,
        s.bank_details,
        s.confirmation_checked,
        s.created_at
    FROM submissions s
    WHERE s.status = 'pending'
    ORDER BY s.created_at DESC;
END;
$$;

-- Function to reject a submission
CREATE OR REPLACE FUNCTION reject_submission(
    submission_id_param UUID,
    admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = admin_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;
    
    -- Update submission status
    UPDATE submissions
    SET 
        status = 'rejected',
        approved_at = NOW(),
        approved_by = admin_id
    WHERE submission_id = submission_id_param
    AND status = 'pending';
    
    RETURN FOUND;
END;
$$;
