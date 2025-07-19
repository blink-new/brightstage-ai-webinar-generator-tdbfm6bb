import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if this is an initialization error we can ignore
    if (error.message?.includes('Cannot access') ||
        error.message?.includes('before initialization') ||
        error.message?.includes('analytics') ||
        error.message?.includes('BlinkNetworkError') ||
        error.message?.includes('Minified React error #185') ||
        error.message?.includes('hydration') ||
        error.message?.includes('validateDOMNesting')) {
      console.warn('Suppressed initialization error in ErrorBoundary:', error)
      return { hasError: false } // Don't show error UI for these
    }

    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is an initialization error we can ignore
    if (error.message?.includes('Cannot access') ||
        error.message?.includes('before initialization') ||
        error.message?.includes('analytics') ||
        error.message?.includes('BlinkNetworkError')) {
      console.warn('Suppressed initialization error in ErrorBoundary:', error, errorInfo)
      return // Don't log or show these errors
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred while loading the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium mb-1">Error Details:</p>
                  <p className="text-xs text-red-700 font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                >
                  Reload Page
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  If this problem persists, please contact support
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // Check if this is an initialization error we can ignore
    if (error.message?.includes('Cannot access') ||
        error.message?.includes('before initialization') ||
        error.message?.includes('analytics') ||
        error.message?.includes('BlinkNetworkError')) {
      console.warn('Suppressed initialization error in useErrorHandler:', error)
      return // Don't process these errors
    }

    console.error('Error caught by error handler:', error, errorInfo)
    // You could also send this to an error reporting service
  }
}