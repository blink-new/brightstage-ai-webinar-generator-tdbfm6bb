/**
 * Security utilities for safe file handling and URL validation
 */

export interface SecureDownloadResult {
  success: boolean
  element?: HTMLAnchorElement
  error?: string
}

export interface SecurityEvent {
  type: string
  context: string
  url?: string
  error?: string
  timestamp: number
  userAgent: string
}

/**
 * Validates and sanitizes URLs for security
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    
    // Only allow HTTPS and data URLs
    if (!['https:', 'data:'].includes(urlObj.protocol)) {
      return false
    }
    
    // Block suspicious domains
    const suspiciousDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'file://',
      'javascript:',
      'vbscript:'
    ]
    
    const hostname = urlObj.hostname.toLowerCase()
    if (suspiciousDomains.some(domain => hostname.includes(domain))) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Sanitizes filename for safe download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\-_.]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 255) // Limit filename length
}

/**
 * Validates file type based on MIME type and extension
 */
export function validateFileType(filename: string, mimeType: string, allowedTypes: string[]): boolean {
  const extension = filename.toLowerCase().split('.').pop()
  const normalizedMimeType = mimeType.toLowerCase()
  
  // Check if extension and MIME type match allowed types
  return allowedTypes.some(type => {
    const [category, subtype] = type.split('/')
    
    if (category === 'video') {
      return (
        ['mp4', 'webm', 'mov', 'avi'].includes(extension || '') &&
        normalizedMimeType.startsWith('video/')
      )
    }
    
    if (category === 'application' && subtype === 'vnd.openxmlformats-officedocument.presentationml.presentation') {
      return (
        extension === 'pptx' &&
        normalizedMimeType.includes('presentation')
      )
    }
    
    return normalizedMimeType === type
  })
}

/**
 * Creates a secure download link with validation
 */
export function createSecureDownloadLink(
  url: string,
  filename: string,
  expectedMimeType?: string
): SecureDownloadResult {
  try {
    // Validate URL
    if (!validateUrl(url)) {
      return {
        success: false,
        error: 'Invalid or unsafe URL provided'
      }
    }
    
    // Sanitize filename
    const safeFilename = sanitizeFilename(filename)
    if (!safeFilename) {
      return {
        success: false,
        error: 'Invalid filename provided'
      }
    }
    
    // Validate file type if MIME type is provided
    if (expectedMimeType) {
      const allowedTypes = [
        'video/mp4',
        'video/webm',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/json'
      ]
      
      if (!validateFileType(safeFilename, expectedMimeType, allowedTypes)) {
        return {
          success: false,
          error: 'File type not allowed for download'
        }
      }
    }
    
    // Create secure download element
    const link = document.createElement('a')
    link.href = url
    link.download = safeFilename
    link.style.display = 'none'
    link.rel = 'noopener noreferrer'
    
    // Add security attributes
    link.setAttribute('data-download-source', 'brightstage-ai')
    link.setAttribute('data-download-time', Date.now().toString())
    
    return {
      success: true,
      element: link
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating download link'
    }
  }
}

/**
 * Logs security events for monitoring
 */
export function logSecurityEvent(type: string, details: Partial<SecurityEvent>): void {
  const event: SecurityEvent = {
    type,
    context: details.context || 'unknown',
    url: details.url,
    error: details.error,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    ...details
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', event)
  }
  
  // In production, you might want to send this to a security monitoring service
  // Example: sendToSecurityService(event)
}

/**
 * Validates blob content before processing
 */
export function validateBlob(blob: Blob, expectedType?: string, maxSize?: number): boolean {
  try {
    // Check if it's actually a Blob
    if (!(blob instanceof Blob)) {
      logSecurityEvent('invalid_blob_type', {
        context: 'blob_validation',
        error: 'Not a valid Blob object'
      })
      return false
    }
    
    // Check size limits
    if (maxSize && blob.size > maxSize) {
      logSecurityEvent('blob_size_exceeded', {
        context: 'blob_validation',
        error: `Blob size ${blob.size} exceeds limit ${maxSize}`
      })
      return false
    }
    
    // Check MIME type if specified
    if (expectedType && blob.type !== expectedType) {
      logSecurityEvent('blob_type_mismatch', {
        context: 'blob_validation',
        error: `Expected ${expectedType}, got ${blob.type}`
      })
      return false
    }
    
    // Check for empty blobs
    if (blob.size === 0) {
      logSecurityEvent('empty_blob', {
        context: 'blob_validation',
        error: 'Blob is empty'
      })
      return false
    }
    
    return true
  } catch (error) {
    logSecurityEvent('blob_validation_error', {
      context: 'blob_validation',
      error: error instanceof Error ? error.message : 'Unknown validation error'
    })
    return false
  }
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return entities[char] || char
    })
    .trim()
    .substring(0, 10000) // Limit input length
}

/**
 * Validates JSON input safely
 */
export function validateJsonInput(input: string): { valid: boolean; data?: any; error?: string } {
  try {
    // Check input length
    if (input.length > 1000000) { // 1MB limit
      return {
        valid: false,
        error: 'JSON input too large'
      }
    }
    
    // Parse JSON
    const data = JSON.parse(input)
    
    // Check for potentially dangerous content
    const jsonString = JSON.stringify(data)
    const dangerousPatterns = [
      'javascript:',
      'data:text/html',
      '<script',
      'eval(',
      'function(',
      '__proto__',
      'constructor'
    ]
    
    if (dangerousPatterns.some(pattern => jsonString.toLowerCase().includes(pattern))) {
      logSecurityEvent('dangerous_json_content', {
        context: 'json_validation',
        error: 'JSON contains potentially dangerous content'
      })
      return {
        valid: false,
        error: 'JSON contains unsafe content'
      }
    }
    
    return {
      valid: true,
      data
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid JSON format'
    }
  }
}

/**
 * Rate limiting utility
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly windowMs: number
  private readonly maxRequests: number
  
  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      logSecurityEvent('rate_limit_exceeded', {
        context: 'rate_limiting',
        error: `Rate limit exceeded for ${identifier}`
      })
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter()

/**
 * Content Security Policy helpers
 */
export function validateCSP(): boolean {
  try {
    // Check if CSP is properly configured
    const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
    
    if (metaTags.length === 0) {
      logSecurityEvent('missing_csp', {
        context: 'csp_validation',
        error: 'No Content Security Policy found'
      })
      return false
    }
    
    return true
  } catch (error) {
    logSecurityEvent('csp_validation_error', {
      context: 'csp_validation',
      error: error instanceof Error ? error.message : 'Unknown CSP validation error'
    })
    return false
  }
}

/**
 * Secure random string generation
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues if available
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Validates environment for security
 */
export function validateEnvironment(): { secure: boolean; warnings: string[] } {
  const warnings: string[] = []
  let secure = true
  
  // Check HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    warnings.push('Application not served over HTTPS')
    secure = false
  }
  
  // Check for development mode in production
  if (process.env.NODE_ENV === 'development' && location.hostname !== 'localhost') {
    warnings.push('Development mode detected in production environment')
    secure = false
  }
  
  // Check for secure context
  if (!window.isSecureContext) {
    warnings.push('Not running in secure context')
    secure = false
  }
  
  return { secure, warnings }
}

// Initialize security checks on module load
if (typeof window !== 'undefined') {
  // Validate environment
  const envCheck = validateEnvironment()
  if (!envCheck.secure) {
    console.warn('Security warnings detected:', envCheck.warnings)
  }
  
  // Validate CSP
  setTimeout(() => {
    validateCSP()
  }, 1000)
}