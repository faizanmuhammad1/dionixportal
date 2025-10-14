import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format').max(255, 'Email too long');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long');
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long').regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters');
export const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format').optional();
export const urlSchema = z.string().url('Invalid URL format').optional();

// Role validation
export const roleSchema = z.enum(['admin', 'manager', 'employee', 'client'], {
  errorMap: () => ({ message: 'Invalid role. Must be admin, manager, employee, or client' })
});

// Project validation schemas
export const projectCreateSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters').max(100, 'Project name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  client_name: z.string().min(1, 'Client name is required').max(100, 'Client name too long'),
  budget: z.number().min(0, 'Budget must be positive').max(10000000, 'Budget too large'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['pending', 'active', 'completed', 'on-hold']).default('pending')
});

export const projectUpdateSchema = projectCreateSchema.partial();

// Employee validation schemas
export const employeeCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: roleSchema,
  department: z.string().max(100, 'Department name too long').optional(),
  position: z.string().max(100, 'Position title too long').optional()
});

export const employeeUpdateSchema = employeeCreateSchema.omit({ password: true }).partial();

// Task validation schemas
export const taskCreateSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  assignee_id: z.string().uuid('Invalid assignee ID'),
  project_id: z.string().uuid('Invalid project ID'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).default('pending'),
  due_date: z.string().datetime().optional()
});

export const taskUpdateSchema = taskCreateSchema.partial();

// Submission validation schemas
export const submissionCreateSchema = z.object({
  project_type: z.string().min(1, 'Project type is required').max(50, 'Project type too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  client_name: z.string().min(1, 'Client name is required').max(100, 'Client name too long'),
  budget: z.number().min(0, 'Budget must be positive').max(10000000, 'Budget too large'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  business_number: z.string().max(20, 'Business number too long').optional(),
  company_email: emailSchema.optional(),
  company_address: z.string().max(500, 'Address too long').optional(),
  about_company: z.string().max(2000, 'Company description too long').optional(),
  social_media_links: z.string().max(1000, 'Social media links too long').optional(),
  public_business_number: z.string().max(20, 'Public business number too long').optional(),
  public_company_email: emailSchema.optional(),
  public_address: z.string().max(500, 'Public address too long').optional(),
  media_links: z.string().max(1000, 'Media links too long').optional(),
  bank_details: z.string().max(2000, 'Bank details too long').optional(),
  confirmation_checked: z.boolean().default(false)
});

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  size: z.number().min(1, 'File size must be greater than 0').max(50 * 1024 * 1024, 'File size too large (max 50MB)'),
  type: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/, 'Invalid file type')
});

// Email validation
export const emailSendSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  text: z.string().max(10000, 'Text content too long').optional(),
  html: z.string().max(50000, 'HTML content too long').optional(),
  attachments: z.array(fileUploadSchema).max(10, 'Too many attachments').optional()
});

// Job application validation
export const jobApplicationSchema = z.object({
  full_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  position: z.string().min(1, 'Position is required').max(100, 'Position too long'),
  cover_letter: z.string().max(5000, 'Cover letter too long').optional(),
  resume_url: urlSchema.optional(),
  experience_years: z.number().min(0, 'Experience years must be positive').max(50, 'Experience years too high').optional(),
  status: z.enum(['pending', 'reviewed', 'accepted', 'rejected']).default('pending')
});

// Form submission validation
export const formSubmissionSchema = z.object({
  form_type: z.string().min(1, 'Form type is required').max(50, 'Form type too long'),
  contact_email: emailSchema,
  contact_name: nameSchema,
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
  company: z.string().max(100, 'Company name too long').optional(),
  phone: phoneSchema
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

export function sanitizeNumber(input: unknown): number {
  const num = Number(input);
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, 999999999));
}

export function sanitizeEmail(input: string): string {
  const email = sanitizeString(input);
  return emailSchema.safeParse(email).success ? email : '';
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}
