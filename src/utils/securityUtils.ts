/**
 * Security utilities for input validation, sanitization, and protection
 */

import DOMPurify from 'dompurify'

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  filename: /^[a-zA-Z0-9._-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const

// Content Security Policy headers
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'media-src': ["'self'", 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://api.stripe.com', 'wss:', 'https:'],
  'frame-src': ["'self'", 'https://js.stripe.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
} as const

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side fallback - basic sanitization
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Validate and sanitize user input
 */
export function validateInput(
  input: string,
  type: keyof typeof VALIDATION_PATTERNS,
  maxLength = 1000
): { isValid: boolean; sanitized: string; error?: string } {
  // Basic length check
  if (input.length > maxLength) {
    return {
      isValid: false,
      sanitized: '',
      error: `Input exceeds maximum length of ${maxLength} characters`
    }
  }

  // Pattern validation
  const pattern = VALIDATION_PATTERNS[type]
  const isValid = pattern.test(input)
  
  if (!isValid) {
    return {
      isValid: false,
      sanitized: '',
      error: `Invalid ${type} format`
    }
  }

  // Sanitize the input
  const sanitized = input.trim()
  
  return {
    isValid: true,
    sanitized
  }
}

/**
 * Escape special characters for safe use in HTML attributes
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for environments without crypto API
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(identifier) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs)
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(identifier, validAttempts)
    
    return true
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

/**
 * Validate file uploads for security
 */
export function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
  ]
  
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed'
    }
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size exceeds 10MB limit'
    }
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return {
      isValid: false,
      error: 'Suspicious file extension detected'
    }
  }
  
  return { isValid: true }
}

/**
 * Secure API key validation
 */
export function validateApiKey(key: string, service: string): boolean {
  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{48}$/,
    stripe: /^sk_(test_|live_)[a-zA-Z0-9]{24,}$/,
    elevenlabs: /^[a-f0-9]{32}$/,
  } as const
  
  const pattern = patterns[service as keyof typeof patterns]
  return pattern ? pattern.test(key) : key.length > 10 && key.length < 200
}

/**
 * Content filtering for inappropriate content
 */
export function filterContent(content: string): { isAppropriate: boolean; filtered: string } {
  // Basic profanity filter - in production, use a more sophisticated service
  const inappropriateWords = [
    // Add inappropriate words here
    'spam', 'scam', 'phishing'
  ]
  
  const lowerContent = content.toLowerCase()
  const hasInappropriate = inappropriateWords.some(word => lowerContent.includes(word))
  
  if (hasInappropriate) {
    return {
      isAppropriate: false,
      filtered: content.replace(new RegExp(inappropriateWords.join('|'), 'gi'), '***')
    }
  }
  
  return {
    isAppropriate: true,
    filtered: content
  }
}

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Validate blob content for security
 */
export function validateBlobContent(blob: Blob): { isValid: boolean; error?: string } {
  // Basic validation
  if (blob.size > 100 * 1024 * 1024) { // 100MB limit
    return {
      isValid: false,
      error: 'File size exceeds 100MB limit'
    }
  }
  
  return { isValid: true }
}

/**
 * Validate URL for security
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url)
    
    // Only allow HTTPS URLs
    if (urlObj.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'Only HTTPS URLs are allowed'
      }
    }
    
    return { isValid: true }
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format'
    }
  }
}

/**
 * Sanitize text content
 */
export function sanitizeTextContent(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}

/**
 * Log security events
 */
export function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  console.warn('Security Event:', event, details)
}

/**
 * Create secure download link
 */
export function createSecureDownloadLink(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob)
  
  // Create a temporary download link
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  return url
}