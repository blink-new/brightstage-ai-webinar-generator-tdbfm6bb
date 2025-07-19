/**
 * Security utilities for file handling and content validation
 * Addresses security vulnerabilities in file uploads/downloads
 */

// MIME type validation
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo' // .avi
] as const

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/ogg'
] as const

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
] as const

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'text/plain',
  'application/json'
] as const

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  video: 500 * 1024 * 1024, // 500MB
  audio: 50 * 1024 * 1024,  // 50MB
  image: 10 * 1024 * 1024,  // 10MB
  document: 25 * 1024 * 1024 // 25MB
} as const

export interface FileValidationResult {
  isValid: boolean
  error?: string
  sanitizedName?: string
  detectedType?: string
}

export interface SecurityConfig {
  enableMimeTypeValidation: boolean
  enableFileSizeValidation: boolean
  enableContentSanitization: boolean
  enableVirusScan: boolean // Future enhancement
  maxFileSize?: number
  allowedTypes?: string[]
}

/**
 * Validates file type and size for security
 */
export function validateFile(
  file: File | Blob, 
  expectedType: 'video' | 'audio' | 'image' | 'document',
  config: SecurityConfig = {
    enableMimeTypeValidation: true,
    enableFileSizeValidation: true,
    enableContentSanitization: true,
    enableVirusScan: false
  }
): FileValidationResult {
  try {
    // Get file properties
    const fileSize = file.size
    const mimeType = file.type || 'application/octet-stream'
    const fileName = (file as File).name || 'unknown'

    // Validate MIME type
    if (config.enableMimeTypeValidation) {
      const allowedTypes = getAllowedTypesForCategory(expectedType)
      if (!allowedTypes.includes(mimeType as any)) {
        return {
          isValid: false,
          error: `Invalid file type. Expected ${expectedType}, got ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`
        }
      }
    }

    // Validate file size
    if (config.enableFileSizeValidation) {
      const maxSize = config.maxFileSize || MAX_FILE_SIZES[expectedType]
      if (fileSize > maxSize) {
        return {
          isValid: false,
          error: `File too large. Maximum size for ${expectedType} is ${formatFileSize(maxSize)}, got ${formatFileSize(fileSize)}`
        }
      }
    }

    // Sanitize filename
    let sanitizedName = fileName
    if (config.enableContentSanitization) {
      sanitizedName = sanitizeFileName(fileName)
    }

    return {
      isValid: true,
      sanitizedName,
      detectedType: mimeType
    }
  } catch (error) {
    return {
      isValid: false,
      error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Validates blob content for security issues
 */
export function validateBlobContent(blob: Blob, expectedType: string): FileValidationResult {
  try {
    // Basic MIME type check
    if (blob.type !== expectedType) {
      return {
        isValid: false,
        error: `MIME type mismatch. Expected ${expectedType}, got ${blob.type}`
      }
    }

    // Size validation
    if (blob.size === 0) {
      return {
        isValid: false,
        error: 'Empty file detected'
      }
    }

    // Check for suspiciously large files
    const maxReasonableSize = 1024 * 1024 * 1024 // 1GB
    if (blob.size > maxReasonableSize) {
      return {
        isValid: false,
        error: `File suspiciously large: ${formatFileSize(blob.size)}`
      }
    }

    return {
      isValid: true,
      detectedType: blob.type
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Blob validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Sanitizes text content to prevent XSS attacks
 */
export function sanitizeTextContent(content: string): string {
  if (typeof content !== 'string') {
    throw new Error('Content must be a string')
  }

  // Remove potentially dangerous HTML tags and scripts
  let sanitized = content
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '') // Remove iframe tags
    .replace(/<object[^>]*>.*?<\/object>/gis, '') // Remove object tags
    .replace(/<embed[^>]*>/gi, '') // Remove embed tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onload, etc.)
    .replace(/data:(?!image\/[a-z]+;base64,)[^;]+;/gi, '') // Remove non-image data URLs

  // Limit content length to prevent DoS
  const MAX_CONTENT_LENGTH = 1024 * 1024 // 1MB
  if (sanitized.length > MAX_CONTENT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_CONTENT_LENGTH) + '... [content truncated for security]'
  }

  return sanitized
}

/**
 * Sanitizes filename to prevent path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return 'unknown_file'
  }

  // Remove path traversal attempts
  let sanitized = fileName
    .replace(/\.\./g, '') // Remove ..
    .replace(/[/\\]/g, '_') // Replace path separators
    .replace(/[<>:"|?*]/g, '_') // Replace invalid filename characters
    .replace(/^[\s.]+|[\s.]+$/g, '') // Trim spaces and dots
    .replace(/\s+/g, '_') // Replace spaces with underscores

  // Ensure filename is not empty and has reasonable length
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'unnamed_file'
  }

  if (sanitized.length > 255) {
    const extension = sanitized.split('.').pop() || ''
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.') || sanitized.length)
    sanitized = nameWithoutExt.substring(0, 250 - extension.length) + '.' + extension
  }

  return sanitized
}

/**
 * Validates URL for security (prevents SSRF and malicious redirects)
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url)
    
    // Only allow HTTPS and HTTP protocols
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: `Invalid protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`
      }
    }

    // Prevent access to private/internal networks
    const hostname = parsedUrl.hostname.toLowerCase()
    const privateNetworks = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.' // Link-local
    ]

    if (privateNetworks.some(network => hostname.startsWith(network))) {
      return {
        isValid: false,
        error: 'Access to private networks is not allowed'
      }
    }

    // Check for suspicious patterns
    if (url.includes('..') || url.includes('%2e%2e')) {
      return {
        isValid: false,
        error: 'Path traversal detected in URL'
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Creates a secure download link with validation
 */
export function createSecureDownloadLink(
  url: string, 
  filename: string, 
  expectedMimeType?: string
): { success: boolean; error?: string; element?: HTMLAnchorElement } {
  try {
    // Validate URL
    const urlValidation = validateUrl(url)
    if (!urlValidation.isValid) {
      return {
        success: false,
        error: `Invalid download URL: ${urlValidation.error}`
      }
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFileName(filename)
    
    // Create secure download element
    const downloadElement = document.createElement('a')
    downloadElement.href = url
    downloadElement.download = sanitizedFilename
    downloadElement.target = '_blank'
    downloadElement.rel = 'noopener noreferrer' // Prevent window.opener access
    
    // Add security headers if possible (limited in client-side)
    downloadElement.setAttribute('data-download-type', expectedMimeType || 'application/octet-stream')
    downloadElement.setAttribute('data-security-validated', 'true')
    
    return {
      success: true,
      element: downloadElement
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to create secure download link: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Helper functions
function getAllowedTypesForCategory(category: 'video' | 'audio' | 'image' | 'document') {
  switch (category) {
    case 'video': return ALLOWED_VIDEO_TYPES
    case 'audio': return ALLOWED_AUDIO_TYPES
    case 'image': return ALLOWED_IMAGE_TYPES
    case 'document': return ALLOWED_DOCUMENT_TYPES
    default: return []
  }
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Security audit logging
export function logSecurityEvent(
  event: 'file_validation_failed' | 'suspicious_upload' | 'invalid_url' | 'xss_attempt',
  details: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  }
  
  // In production, send to security monitoring service
  console.warn('Security Event:', logEntry)
  
  // Store locally for debugging (remove in production)
  try {
    const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]')
    securityLogs.push(logEntry)
    
    // Keep only last 100 entries
    if (securityLogs.length > 100) {
      securityLogs.splice(0, securityLogs.length - 100)
    }
    
    localStorage.setItem('security_logs', JSON.stringify(securityLogs))
  } catch (error) {
    console.warn('Failed to store security log:', error)
  }
}