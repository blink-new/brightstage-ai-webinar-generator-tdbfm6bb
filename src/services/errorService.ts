/**
 * Centralized error handling and logging service with enhanced production features
 */

interface ErrorContext {
  userId?: string
  action?: string
  component?: string
  metadata?: Record<string, unknown>
  userAgent?: string
  url?: string
  timestamp?: number
}

interface ErrorLog {
  id: string
  message: string
  stack?: string
  timestamp: number
  level: 'error' | 'warn' | 'info' | 'debug'
  context?: ErrorContext
  fingerprint?: string
  count?: number
}

interface ErrorStats {
  totalErrors: number
  errorsByLevel: Record<string, number>
  errorsByComponent: Record<string, number>
  recentErrors: ErrorLog[]
  topErrors: Array<{ message: string; count: number; lastSeen: number }>
}

class ErrorService {
  private errors: ErrorLog[] = []
  private errorCounts = new Map<string, { count: number; lastSeen: number }>()
  private suppressedErrors = new Set<string>()
  private maxErrors = 1000
  private isInitialized = false

  /**
   * Initialize error service with global handlers
   */
  initialize(): void {
    if (this.isInitialized) return
    
    this.setupGlobalErrorHandling()
    this.isInitialized = true
  }

  /**
   * Log an error with enhanced context and deduplication
   */
  logError(
    error: Error | string, 
    context?: ErrorContext, 
    level: 'error' | 'warn' | 'info' | 'debug' = 'error'
  ): void {
    const message = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'object' ? error.stack : undefined
    
    // Check if this is a non-critical error that should be suppressed
    if (this.isNonCriticalError(error)) {
      console.warn(`Suppressed non-critical error:`, error)
      return
    }
    
    // Create fingerprint for deduplication
    const fingerprint = this.createFingerprint(message, stack, context?.component)
    
    // Check if this error has been seen before
    const existingCount = this.errorCounts.get(fingerprint)
    if (existingCount) {
      existingCount.count++
      existingCount.lastSeen = Date.now()
      
      // Update the existing error log
      const existingError = this.errors.find(e => e.fingerprint === fingerprint)
      if (existingError) {
        existingError.count = existingCount.count
        existingError.timestamp = Date.now()
        return
      }
    } else {
      this.errorCounts.set(fingerprint, { count: 1, lastSeen: Date.now() })
    }

    const errorLog: ErrorLog = {
      id: this.generateId(),
      message,
      stack,
      timestamp: Date.now(),
      level,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        timestamp: Date.now()
      },
      fingerprint,
      count: 1
    }

    this.errors.push(errorLog)

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       level === 'info' ? console.info : console.log
      logMethod('Error logged:', errorLog)
    }

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorLog)
    }

    // Trigger alerts for critical errors
    if (level === 'error' && this.isCriticalError(message)) {
      this.triggerCriticalAlert(errorLog)
    }
  }

  /**
   * Log API errors with additional context
   */
  logApiError(
    endpoint: string,
    status: number,
    response: unknown,
    context?: ErrorContext
  ): void {
    this.logError(
      `API Error: ${endpoint} returned ${status}`,
      {
        ...context,
        action: 'api_error',
        metadata: {
          endpoint,
          status,
          response: typeof response === 'string' ? response : JSON.stringify(response),
          ...context?.metadata
        }
      },
      status >= 500 ? 'error' : 'warn'
    )
  }

  /**
   * Log user action errors
   */
  logUserActionError(
    action: string,
    error: Error | string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.logError(error, {
      userId,
      action,
      component: 'user_action',
      metadata
    })
  }

  /**
   * Check if error is non-critical and should be suppressed
   */
  private isNonCriticalError(error: any): boolean {
    const message = error?.message || ''
    const stack = error?.stack || ''
    
    return (
      message.includes('analytics') ||
      message.includes('BlinkNetworkError') ||
      message.includes('Failed to send analytics events') ||
      message.includes('Failed to fetch') ||
      message.includes('Cannot access') ||
      message.includes('before initialization') ||
      message.includes('Minified React error #185') ||
      message.includes('hydration') ||
      message.includes('validateDOMNesting') ||
      stack.includes('fk.flush') ||
      stack.includes('J_.request') ||
      stack.includes('analytics')
    )
  }

  /**
   * Get error statistics for admin dashboard
   */
  getErrorStats(): ErrorStats {
    const errorsByLevel = this.errors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + (error.count || 1)
      return acc
    }, {} as Record<string, number>)

    const errorsByComponent = this.errors.reduce((acc, error) => {
      const component = error.context?.component || 'unknown'
      acc[component] = (acc[component] || 0) + (error.count || 1)
      return acc
    }, {} as Record<string, number>)

    const recentErrors = this.errors
      .filter(error => Date.now() - error.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([fingerprint, data]) => {
        const error = this.errors.find(e => e.fingerprint === fingerprint)
        return {
          message: error?.message || 'Unknown error',
          count: data.count,
          lastSeen: data.lastSeen
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalErrors: this.errors.reduce((sum, error) => sum + (error.count || 1), 0),
      errorsByLevel,
      errorsByComponent,
      recentErrors,
      topErrors
    }
  }

  /**
   * Get recent errors for admin dashboard
   */
  getRecentErrors(limit = 50, level?: string): ErrorLog[] {
    let filteredErrors = this.errors
    
    if (level) {
      filteredErrors = this.errors.filter(error => error.level === level)
    }
    
    return filteredErrors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Search errors by message or component
   */
  searchErrors(query: string, limit = 50): ErrorLog[] {
    const lowerQuery = query.toLowerCase()
    return this.errors
      .filter(error => 
        error.message.toLowerCase().includes(lowerQuery) ||
        error.context?.component?.toLowerCase().includes(lowerQuery) ||
        error.context?.action?.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Clear error logs
   */
  clearErrors(): void {
    this.errors = []
    this.errorCounts.clear()
  }

  /**
   * Clear suppressed errors (useful for testing)
   */
  clearSuppressed(): void {
    this.suppressedErrors.clear()
  }

  /**
   * Create fingerprint for error deduplication
   */
  private createFingerprint(message: string, stack?: string, component?: string): string {
    const key = `${message}:${component || 'unknown'}`
    // Simple hash function for fingerprinting
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Generate unique ID for error logs
   */
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Check if error is critical and needs immediate attention
   */
  private isCriticalError(message: string): boolean {
    const criticalPatterns = [
      /payment.*failed/i,
      /database.*connection/i,
      /authentication.*failed/i,
      /security.*breach/i,
      /unauthorized.*access/i,
      /data.*corruption/i
    ]
    
    return criticalPatterns.some(pattern => pattern.test(message))
  }

  /**
   * Trigger critical error alerts
   */
  private async triggerCriticalAlert(errorLog: ErrorLog): Promise<void> {
    try {
      // In production, send to alerting service (PagerDuty, Slack, etc.)
      console.error('CRITICAL ERROR ALERT:', errorLog)
      
      // Example: Send to webhook
      // await fetch('/api/alerts/critical', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // })
    } catch (err) {
      console.error('Failed to send critical alert:', err)
    }
  }

  /**
   * Send error to external monitoring service
   */
  private async sendToExternalService(errorLog: ErrorLog): Promise<void> {
    try {
      // Example integrations:
      
      // Sentry
      // Sentry.captureException(new Error(errorLog.message), {
      //   tags: { component: errorLog.context?.component },
      //   extra: errorLog.context?.metadata
      // })
      
      // Custom API endpoint
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // })
      
      // For now, just log to console in production
      if (errorLog.level === 'error') {
        console.error('Production Error:', errorLog)
      }
    } catch (err) {
      console.error('Failed to send error to external service:', err)
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        new Error(`Unhandled promise rejection: ${event.reason}`),
        { 
          action: 'unhandled_promise_rejection',
          component: 'global_handler'
        }
      )
      
      // Prevent the default browser behavior
      event.preventDefault()
    })

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.logError(
        new Error(`Uncaught error: ${event.message}`),
        { 
          action: 'uncaught_error',
          component: 'global_handler',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      )
    })

    // Handle React error boundaries (if using React)
    const originalConsoleError = console.error
    console.error = (...args) => {
      // Check if this is a React error
      const message = args[0]
      if (typeof message === 'string' && message.includes('React')) {
        this.logError(
          new Error(message),
          {
            action: 'react_error',
            component: 'react_error_boundary'
          }
        )
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args)
    }
  }

  /**
   * Method to manually report errors
   */
  reportError(error: any, context: string = 'manual'): void {
    this.logError(error, { action: context })
  }
}

// Export singleton instance
export const errorService = new ErrorService()

/**
 * Initialize global error handling
 */
export function setupGlobalErrorHandling(): void {
  errorService.initialize()
}

/**
 * Error boundary hook for React components
 */
export function useErrorHandler() {
  return {
    logError: errorService.logError.bind(errorService),
    logApiError: errorService.logApiError.bind(errorService),
    logUserActionError: errorService.logUserActionError.bind(errorService)
  }
}

// Export types
export type { ErrorLog, ErrorContext, ErrorStats }