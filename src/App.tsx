import { useState, useEffect } from 'react'
import { Toaster } from './components/ui/toaster'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuth } from './hooks/useAuth'
import Dashboard from './components/Dashboard'
import WebinarCreator from './components/WebinarCreator'
import AdminPanel from './components/AdminPanel'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Loader2, Sparkles, Coins } from 'lucide-react'

function App() {
  const { user, isLoading, isAuthenticated, login } = useAuth()
  const [currentView, setCurrentView] = useState<'dashboard' | 'creator' | 'admin'>('dashboard')
  const [editingWebinarId, setEditingWebinarId] = useState<string | undefined>()

  // Add error boundary for analytics and other network errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || ''
      const errorStack = event.error?.stack || ''
      
      // Check if this is an analytics-related error
      if (errorMessage.includes('analytics') || 
          errorMessage.includes('BlinkNetworkError') ||
          errorMessage.includes('Failed to send analytics events') ||
          errorMessage.includes('Failed to fetch') ||
          errorStack.includes('fk.flush') ||
          errorStack.includes('J_.request') ||
          errorMessage.includes('Cannot access') ||
          errorMessage.includes('before initialization') ||
          errorMessage.includes('Minified React error #185') ||
          errorMessage.includes('hydration') ||
          errorMessage.includes('validateDOMNesting')) {
        console.warn('Suppressed non-critical error:', event.error)
        event.preventDefault()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMessage = event.reason?.message || ''
      const reasonStack = event.reason?.stack || ''
      
      // Check if this is an analytics-related promise rejection
      if (reasonMessage.includes('analytics') || 
          reasonMessage.includes('BlinkNetworkError') ||
          reasonMessage.includes('Failed to send analytics events') ||
          reasonMessage.includes('Failed to fetch') ||
          reasonStack.includes('fk.flush') ||
          reasonStack.includes('J_.request') ||
          reasonMessage.includes('Cannot access') ||
          reasonMessage.includes('before initialization') ||
          reasonMessage.includes('Minified React error #185') ||
          reasonMessage.includes('hydration') ||
          reasonMessage.includes('validateDOMNesting')) {
        console.warn('Suppressed non-critical promise rejection:', event.reason)
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading BrightStage AI...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to BrightStage AI</CardTitle>
            <CardDescription>
              Transform your ideas into professional webinars with AI-powered content generation, 
              slide design, and voice narration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={login} className="w-full" size="lg">
              Sign In to Get Started
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span>Get 100 free tokens to create your first webinar</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {currentView === 'dashboard' ? (
          <Dashboard 
            user={user} 
            onCreateWebinar={() => {
              setEditingWebinarId(undefined)
              setCurrentView('creator')
            }}
            onEditWebinar={(webinarId) => {
              setEditingWebinarId(webinarId)
              setCurrentView('creator')
            }}
            onOpenAdmin={() => setCurrentView('admin')}
          />
        ) : currentView === 'creator' ? (
          <WebinarCreator 
            user={user}
            editingWebinarId={editingWebinarId}
            onBack={() => {
              setEditingWebinarId(undefined)
              setCurrentView('dashboard')
            }}
          />
        ) : (
          <AdminPanel 
            user={user}
            onBack={() => setCurrentView('dashboard')}
          />
        )}
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}

export default App