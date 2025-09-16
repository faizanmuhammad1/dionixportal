-- Insert default admin user (password: admin123)
-- Note: In production, use proper password hashing
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES (
  'admin@company.com',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', -- This should be properly hashed in production
  'admin',
  'Admin',
  'User'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample employee user (password: employee123)
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES (
  'employee@company.com',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', -- This should be properly hashed in production
  'employee',
  'Employee',
  'User'
) ON CONFLICT (email) DO NOTHING;
