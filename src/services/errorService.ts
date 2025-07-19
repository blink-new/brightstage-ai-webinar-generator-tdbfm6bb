import { analytics } from './analyticsService'
import { blink } from '../blink/client'

interface ErrorReport {
  id: string
  userId?: string
  error: string
  stack?: string
  context: Record<string, any>
  userAgent: string
  url: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class ErrorService {
  private errorQueue: ErrorReport[] = []
  private isProcessing = false

  async reportError(
    error: Error | string, 
    context: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    try {
      const errorReport: ErrorReport = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        severity
      }

      // Add to queue for batch processing
      this.errorQueue.push(errorReport)

      // Process immediately for critical errors
      if (severity === 'critical') {
        await this.processErrorQueue()
      } else {
        // Process queue every 30 seconds for non-critical errors
        this.scheduleProcessing()
      }

      // Also track in analytics
      analytics.trackError(errorReport.error, {
        ...context,
        severity,
        stack: errorReport.stack
      })

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error reported:', errorReport)
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private scheduleProcessing() {
    if (this.isProcessing) return

    setTimeout(() => {
      this.processErrorQueue()
    }, 30000) // 30 seconds
  }

  private async processErrorQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) return

    this.isProcessing = true

    try {
      const errorsToProcess = [...this.errorQueue]
      this.errorQueue = []

      // Store errors in database
      for (const errorReport of errorsToProcess) {
        try {
          await blink.db.errorLogs.create({
            id: errorReport.id,
            userId: errorReport.userId,
            error: errorReport.error,
            stack: errorReport.stack,
            context: errorReport.context,
            userAgent: errorReport.userAgent,
            url: errorReport.url,
            severity: errorReport.severity,
            createdAt: errorReport.timestamp
          })
        } catch (dbError) {
          console.warn('Failed to store error in database:', dbError)
          // Re-add to queue for retry
          this.errorQueue.push(errorReport)
        }
      }
    } catch (processingError) {
      console.error('Error processing error queue:', processingError)
    } finally {
      this.isProcessing = false
    }
  }

  // Specific error reporting methods
  async reportAuthError(error: Error, context: any = {}) {
    await this.reportError(error, { ...context, category: 'auth' }, 'high')
  }

  async reportAPIError(error: Error, endpoint: string, context: any = {}) {
    await this.reportError(error, { 
      ...context, 
      category: 'api',
      endpoint 
    }, 'medium')
  }

  async reportGenerationError(error: Error, step: string, projectId: string, context: any = {}) {
    await this.reportError(error, {
      ...context,
      category: 'generation',
      step,
      projectId
    }, 'high')
  }

  async reportUIError(error: Error, component: string, context: any = {}) {
    await this.reportError(error, {
      ...context,
      category: 'ui',
      component
    }, 'low')
  }

  async reportPaymentError(error: Error, context: any = {}) {
    await this.reportError(error, {
      ...context,
      category: 'payment'
    }, 'critical')
  }

  // Set user context for error reports
  setUserContext(userId: string) {
    this.errorQueue.forEach(error => {
      error.userId = userId
    })
  }

  // Get error statistics for admin dashboard
  async getErrorStats(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day') {
    try {
      const now = new Date()
      const timeAgo = new Date()
      
      switch (timeframe) {
        case 'hour':
          timeAgo.setHours(now.getHours() - 1)
          break
        case 'day':
          timeAgo.setDate(now.getDate() - 1)
          break
        case 'week':
          timeAgo.setDate(now.getDate() - 7)
          break
        case 'month':
          timeAgo.setMonth(now.getMonth() - 1)
          break
      }

      const errors = await blink.db.errorLogs.list({
        where: {
          createdAt: { gte: timeAgo.toISOString() }
        },
        limit: 1000
      })

      const stats = {
        total: errors.length,
        bySeverity: {
          low: errors.filter(e => e.severity === 'low').length,
          medium: errors.filter(e => e.severity === 'medium').length,
          high: errors.filter(e => e.severity === 'high').length,
          critical: errors.filter(e => e.severity === 'critical').length
        },
        byCategory: {} as Record<string, number>,
        recentErrors: errors.slice(0, 10)
      }

      // Count by category
      errors.forEach(error => {
        const category = error.context?.category || 'unknown'
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Failed to get error stats:', error)
      return {
        total: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byCategory: {},
        recentErrors: []
      }
    }
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  errorService.reportError(event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  }, 'medium')
})

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorService.reportError(event.reason, {
    type: 'unhandled_promise_rejection'
  }, 'high')
})

// Export singleton instance
export const errorService = new ErrorService()

// Export class for testing
export { ErrorService }