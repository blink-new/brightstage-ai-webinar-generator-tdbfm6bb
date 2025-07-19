/**
 * Security monitoring and threat detection service
 */

import { validateInput, RateLimiter, validateFileUpload, filterContent } from '../utils/securityUtils'

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'invalid_input' | 'file_upload_blocked'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, unknown>
  timestamp: number
  userId?: string
  ip?: string
}

interface SecurityConfig {
  enableRateLimit: boolean
  enableContentFilter: boolean
  enableFileValidation: boolean
  logSecurityEvents: boolean
  maxRequestsPerMinute: number
  suspiciousActivityThreshold: number
}

class SecurityService {
  private rateLimiter: RateLimiter
  private securityEvents: SecurityEvent[] = []
  private config: SecurityConfig
  private suspiciousActivityCount = new Map<string, number>()

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRateLimit: true,
      enableContentFilter: true,
      enableFileValidation: true,
      logSecurityEvents: true,
      maxRequestsPerMinute: 60,
      suspiciousActivityThreshold: 5,
      ...config
    }

    this.rateLimiter = new RateLimiter(
      this.config.maxRequestsPerMinute,
      60 * 1000 // 1 minute window
    )
  }

  /**
   * Validate and sanitize user input with security checks
   */
  async validateUserInput(
    input: string,
    type: 'email' | 'url' | 'alphanumeric' | 'filename',
    userId?: string
  ): Promise<{ isValid: boolean; sanitized: string; error?: string }> {
    try {
      // Rate limiting check
      if (this.config.enableRateLimit && userId) {
        if (!this.rateLimiter.isAllowed(userId)) {
          this.logSecurityEvent({
            type: 'rate_limit_exceeded',
            severity: 'medium',
            details: { userId, inputType: type },
            timestamp: Date.now(),
            userId
          })
          return {
            isValid: false,
            sanitized: '',
            error: 'Rate limit exceeded. Please try again later.'
          }
        }
      }

      // Input validation
      const validation = validateInput(input, type)
      
      if (!validation.isValid) {
        this.logSecurityEvent({
          type: 'invalid_input',
          severity: 'low',
          details: { inputType: type, error: validation.error },
          timestamp: Date.now(),
          userId
        })
        return validation
      }

      // Content filtering
      if (this.config.enableContentFilter) {
        const contentCheck = filterContent(validation.sanitized)
        if (!contentCheck.isAppropriate) {
          this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            details: { reason: 'inappropriate_content', inputType: type },
            timestamp: Date.now(),
            userId
          })
          return {
            isValid: false,
            sanitized: '',
            error: 'Content contains inappropriate material'
          }
        }
      }

      return validation
    } catch (error) {
      console.error('Security validation error:', error)
      return {
        isValid: false,
        sanitized: '',
        error: 'Validation failed'
      }
    }
  }

  /**
   * Validate file uploads with security checks
   */
  async validateFileUploadSecurity(file: File, userId?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!this.config.enableFileValidation) {
        return { isValid: true }
      }

      const validation = validateFileUpload(file)
      
      if (!validation.isValid) {
        this.logSecurityEvent({
          type: 'file_upload_blocked',
          severity: 'medium',
          details: { 
            fileName: file.name, 
            fileSize: file.size, 
            fileType: file.type,
            error: validation.error 
          },
          timestamp: Date.now(),
          userId
        })
      }

      return validation
    } catch (error) {
      console.error('File validation error:', error)
      return {
        isValid: false,
        error: 'File validation failed'
      }
    }
  }

  /**
   * Monitor for suspicious activity patterns
   */
  detectSuspiciousActivity(userId: string, activityType: string): boolean {
    const key = `${userId}:${activityType}`
    const currentCount = this.suspiciousActivityCount.get(key) || 0
    const newCount = currentCount + 1

    this.suspiciousActivityCount.set(key, newCount)

    // Reset counter after 1 hour
    setTimeout(() => {
      this.suspiciousActivityCount.delete(key)
    }, 60 * 60 * 1000)

    if (newCount >= this.config.suspiciousActivityThreshold) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        details: { 
          activityType, 
          count: newCount,
          threshold: this.config.suspiciousActivityThreshold 
        },
        timestamp: Date.now(),
        userId
      })
      return true
    }

    return false
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(event: SecurityEvent): void {
    if (!this.config.logSecurityEvents) return

    this.securityEvents.push(event)

    // Keep only last 1000 events to prevent memory issues
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security Event:', event)
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production' && event.severity === 'critical') {
      this.sendToMonitoringService(event)
    }
  }

  /**
   * Send critical security events to external monitoring service
   */
  private async sendToMonitoringService(event: SecurityEvent): Promise<void> {
    try {
      // In a real application, send to services like Sentry, DataDog, etc.
      console.error('CRITICAL SECURITY EVENT:', event)
      
      // Example: Send to webhook or monitoring API
      // await fetch('/api/security/alert', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // })
    } catch (error) {
      console.error('Failed to send security event to monitoring service:', error)
    }
  }

  /**
   * Get security events for admin dashboard
   */
  getSecurityEvents(severity?: SecurityEvent['severity']): SecurityEvent[] {
    if (severity) {
      return this.securityEvents.filter(event => event.severity === severity)
    }
    return [...this.securityEvents]
  }

  /**
   * Clear security events (admin function)
   */
  clearSecurityEvents(): void {
    this.securityEvents = []
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number
    eventsBySeverity: Record<SecurityEvent['severity'], number>
    eventsByType: Record<SecurityEvent['type'], number>
    recentEvents: SecurityEvent[]
  } {
    const eventsBySeverity = this.securityEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1
      return acc
    }, {} as Record<SecurityEvent['severity'], number>)

    const eventsByType = this.securityEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<SecurityEvent['type'], number>)

    const recentEvents = this.securityEvents
      .filter(event => Date.now() - event.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)

    return {
      totalEvents: this.securityEvents.length,
      eventsBySeverity,
      eventsByType,
      recentEvents
    }
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update rate limiter if needed
    if (newConfig.maxRequestsPerMinute) {
      this.rateLimiter = new RateLimiter(newConfig.maxRequestsPerMinute, 60 * 1000)
    }
  }

  /**
   * Reset rate limiting for a user (admin function)
   */
  resetRateLimit(userId: string): void {
    this.rateLimiter.reset(userId)
  }
}

// Export singleton instance
export const securityService = new SecurityService()

// Export types for use in other modules
export type { SecurityEvent, SecurityConfig }