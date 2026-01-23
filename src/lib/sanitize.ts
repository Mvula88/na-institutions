/**
 * Input Sanitization Utility
 * Provides XSS protection and input sanitization
 */

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  }

  return input.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char)
}

/**
 * Sanitizes a search query to prevent injection attacks
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return ''
  }

  // Trim whitespace
  let sanitized = query.trim()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Limit length to prevent DoS
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500)
  }

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape special regex characters that could be problematic in ILIKE queries
  // but keep basic alphanumeric and common punctuation
  sanitized = sanitized.replace(/[%_\\]/g, (char) => '\\' + char)

  return sanitized
}

/**
 * Sanitizes input for use in SQL ILIKE patterns
 * Escapes special PostgreSQL pattern characters
 */
export function sanitizeForILike(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Escape PostgreSQL LIKE special characters: % _ \
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/**
 * Sanitizes user input for general text fields
 * Removes potentially dangerous content while preserving useful text
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input.trim()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000)
  }

  return sanitized
}

/**
 * Sanitizes a URL to prevent javascript: and data: URI attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return ''
    }
  }

  // Allow http, https, mailto, tel, and relative URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    !trimmed.includes(':')
  ) {
    return url.trim()
  }

  return ''
}

/**
 * Sanitizes a filename to prevent directory traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  // Remove path separators and null bytes
  let sanitized = filename
    .replace(/\0/g, '')
    .replace(/[/\\]/g, '')
    .replace(/\.\./g, '')

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '')

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255)
  }

  // If empty after sanitization, return a default
  if (!sanitized) {
    return 'unnamed_file'
  }

  return sanitized
}

/**
 * Sanitizes email address input
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Trim and lowercase
  let sanitized = email.trim().toLowerCase()

  // Remove any HTML tags or scripts
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  // Limit length
  if (sanitized.length > 254) {
    sanitized = sanitized.substring(0, 254)
  }

  return sanitized
}

/**
 * Sanitizes phone number input
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  // Remove everything except digits, plus sign, spaces, and hyphens
  let sanitized = phone.replace(/[^\d+\s-]/g, '')

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Limit length
  if (sanitized.length > 20) {
    sanitized = sanitized.substring(0, 20)
  }

  return sanitized
}

/**
 * Deep sanitizes an object by applying sanitization to all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { sanitizeHtml?: boolean } = {}
): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = options.sanitizeHtml ? escapeHtml(sanitizeText(value)) : sanitizeText(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? options.sanitizeHtml
            ? escapeHtml(sanitizeText(item))
            : sanitizeText(item)
          : item
      )
    } else {
      result[key] = value
    }
  }

  return result as T
}
