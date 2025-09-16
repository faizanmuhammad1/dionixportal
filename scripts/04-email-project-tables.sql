-- Create emails table for email integration
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  subject TEXT NOT NULL,
  body TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table for project management
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table for project tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample email data
INSERT INTO emails (sender_email, sender_name, subject, body, received_at, is_read, priority) VALUES
('client@example.com', 'John Client', 'Project Update Required', 'Hi, I need an update on the current project status. When can we expect the next milestone?', NOW() - INTERVAL '2 hours', false, 'high'),
('support@vendor.com', 'Support Team', 'Monthly Report Available', 'Your monthly analytics report is now available for download.', NOW() - INTERVAL '1 day', true, 'normal'),
('partner@business.com', 'Sarah Partner', 'Meeting Reschedule', 'Can we reschedule our meeting from tomorrow to next week?', NOW() - INTERVAL '3 hours', false, 'normal'),
('info@newsletter.com', 'Newsletter', 'Weekly Industry Updates', 'This week in tech: AI developments and market trends.', NOW() - INTERVAL '2 days', true, 'low');

-- Insert sample project data
INSERT INTO projects (name, description, status, priority, start_date, due_date, created_by) VALUES
('Website Redesign', 'Complete overhaul of company website with modern design', 'active', 'high', '2024-01-15', '2024-03-15', 1),
('Mobile App Development', 'Native mobile app for iOS and Android platforms', 'active', 'medium', '2024-02-01', '2024-06-01', 1),
('Database Migration', 'Migrate legacy database to new cloud infrastructure', 'planning', 'high', '2024-03-01', '2024-04-30', 1);

-- Insert sample task data
INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, created_by, due_date) VALUES
(1, 'Design Homepage Mockup', 'Create initial design mockups for the new homepage', 'completed', 'high', 2, 1, '2024-01-25'),
(1, 'Implement Responsive Layout', 'Code the responsive layout based on approved designs', 'in-progress', 'high', 2, 1, '2024-02-10'),
(1, 'Content Migration', 'Migrate existing content to new website structure', 'todo', 'medium', 2, 1, '2024-02-20'),
(2, 'Setup Development Environment', 'Configure React Native development environment', 'completed', 'high', 2, 1, '2024-02-05'),
(2, 'User Authentication Module', 'Implement user login and registration functionality', 'in-progress', 'high', 2, 1, '2024-02-25'),
(3, 'Database Schema Analysis', 'Analyze current database structure and dependencies', 'todo', 'high', 1, 1, '2024-03-10');
