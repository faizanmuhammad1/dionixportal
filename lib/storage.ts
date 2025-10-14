import { createClient } from "./supabase"
import { sanitizeFilename } from "./sanitize"

// SECURITY: File validation function
function validateFile(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    errors.push('File size exceeds 50MB limit');
  }
  
  // Check file name
  if (!file.name || file.name.length > 255) {
    errors.push('Invalid file name');
  }
  
  // Check file type (allow common safe types)
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }
  
  // Check for dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar', '.sh', '.ps1'];
  const hasDangerousExtension = dangerousExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (hasDangerousExtension) {
    errors.push('File type is potentially dangerous');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export async function uploadProjectFile(params: {
  projectId: string
  file: File
  path?: string
}) {
  const { projectId, file } = params
  
  // SECURITY: Validate file before upload
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }
  
  const safeName = sanitizeFilename(file.name);
  const prefix = params.path ? params.path.replace(/^\/+|\/+$/g, "") + "/" : ""
  const key = `${prefix}${Date.now()}_${safeName}`
  const objectPath = `project/${projectId}/${key}`

  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("project-files")
    .upload(objectPath, file, { upsert: true, contentType: file.type })

  if (error) throw error
  return { bucket: "project-files", path: objectPath, key }
}

export async function createSignedUrl(params: {
  projectId: string
  key: string
  expiresIn?: number
}) {
  const { projectId, key, expiresIn = 60 * 10 } = params
  const objectPath = `project/${projectId}/${key}`

  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(objectPath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function createSignedUrlByPath(path: string, expiresIn: number = 60 * 10) {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function removeProjectFile(params: {
  projectId: string
  key: string
}) {
  const { projectId, key } = params
  const objectPath = `project/${projectId}/${key}`
  const supabase = createClient()
  const { error } = await supabase.storage.from("project-files").remove([objectPath])
  if (error) throw error
}
