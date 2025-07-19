// Enhanced error service with analytics error suppression
export class ErrorService {
  private static instance: ErrorService
  private suppressedErrors = new Set<string>()

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  private constructor() {
    this.setupGlobalErrorHandlers()
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'uncaught_error')
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'unhandled_rejection')
    })
  }

  private isAnalyticsError(error: any): boolean {
    const message = error?.message || ''
    const stack = error?.stack || ''
    
    return (
      message.includes('analytics') ||
      message.includes('BlinkNetworkError') ||
      message.includes('Failed to send analytics events') ||
      message.includes('Failed to fetch') ||
      stack.includes('fk.flush') ||
      stack.includes('J_.request') ||
      stack.includes('analytics')
    )
  }

  private isNonCriticalError(error: any): boolean {
    const message = error?.message || ''
    
    return (
      this.isAnalyticsError(error) ||
      message.includes('Cannot access') ||
      message.includes('before initialization') ||
      message.includes('Minified React error #185') ||
      message.includes('hydration') ||
      message.includes('validateDOMNesting')
    )
  }

  handleError(error: any, context: string = 'unknown') {
    const errorKey = `${error?.name || 'Error'}_${error?.message || 'unknown'}`
    
    // Suppress repeated errors
    if (this.suppressedErrors.has(errorKey)) {
      return
    }

    if (this.isNonCriticalError(error)) {
      console.warn(`Suppressed non-critical error (${context}):`, error)
      this.suppressedErrors.add(errorKey)
      return
    }

    // Log critical errors
    console.error(`Critical error (${context}):`, error)
    
    // You could send critical errors to a monitoring service here
    // this.sendToMonitoring(error, context)
  }

  // Method to manually report errors
  reportError(error: any, context: string = 'manual') {
    if (!this.isNonCriticalError(error)) {
      this.handleError(error, context)
    }
  }

  // Clear suppressed errors (useful for testing)
  clearSuppressed() {
    this.suppressedErrors.clear()
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance()