import DOMPurify from 'dompurify';

/**
 * Get DOMPurify instance - server or client side
 */
function getPurify() {
  if (typeof window !== 'undefined') {
    // Browser environment
    return DOMPurify;
  } else {
    // Server environment - use isomorphic-dompurify or basic sanitization
    // For server-side, we'll use a simpler sanitization approach
    return null;
  }
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML content to sanitize
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, options?: {
  allowTags?: string[];
  allowAttributes?: string[];
  stripTags?: boolean;
}): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const purify = getPurify();

  if (!purify) {
    // Server-side fallback - basic sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/javascript:/gi, '');
  }

  const config = {
    ALLOWED_TAGS: options?.allowTags || ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: options?.allowAttributes || ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    ...options
  };

  return purify.sanitize(html, config);
}

/**
 * Sanitize plain text content
 * @param text - The text content to sanitize
 * @returns Sanitized text string
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize JSON content to prevent injection
 * @param jsonString - The JSON string to sanitize
 * @returns Sanitized JSON string
 */
export function sanitizeJson(jsonString: string): string {
  if (!jsonString || typeof jsonString !== 'string') {
    return '{}';
  }

  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

/**
 * Sanitize file name to prevent path traversal
 * @param filename - The file name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters
    .replace(/\.\./g, '_') // Prevent path traversal
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Sanitize email content for display
 * @param content - The email content to sanitize
 * @returns Sanitized email content
 */
export function sanitizeEmailContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // More restrictive sanitization for email content
  return sanitizeHtml(content, {
    allowTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'a'],
    allowAttributes: ['href', 'target', 'rel'],
    stripTags: false
  });
}
