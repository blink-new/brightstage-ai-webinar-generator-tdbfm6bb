import { useState } from 'react'
import { Plus, Video, FileText, Clock, Settings, LogOut, Coins, Trash2, Edit } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Logo } from './ui/logo'
import { useAuth } from '../hooks/useAuth'
import { useWebinarProject } from '../hooks/useWebinarProject'
import { useToast } from '../hooks/use-toast'

interface User {
  id: string
  email: string
  displayName?: string
  tokensBalance: number
}

interface DashboardProps {
  user: User
  onCreateWebinar: () => void
  onEditWebinar?: (webinarId: string) => void
  onOpenAdmin?: () => void
}

function Dashboard({ user, onCreateWebinar, onEditWebinar, onOpenAdmin }: DashboardProps) {
  const { logout } = useAuth()
  const { projects, loading, deleteProject } = useWebinarProject(user.id)
  const { toast } = useToast()

  const handleDeleteWebinar = async (projectId: string, projectTitle: string) => {
    if (confirm(`Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`)) {
      try {
        await deleteProject(projectId)
        toast({
          title: 'Webinar deleted',
          description: `"${projectTitle}" has been removed from your dashboard.`
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete webinar. Please try again.',
          variant: 'destructive'
        })
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'generating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const completedProjects = projects.filter(p => p.status === 'completed')
  const totalDuration = projects.reduce((acc, p) => acc + p.durationMinutes, 0)
  const totalTokensUsed = projects.reduce((acc, p) => acc + p.tokensUsed, 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo size="md" showText={true} />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-accent/10 px-3 py-1 rounded-full">
                <Coins className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{user.tokensBalance.toLocaleString()} tokens</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {user.displayName || user.email.split('@')[0]}
                </span>
                {onOpenAdmin && (
                  <Button variant="ghost" size="sm" onClick={onOpenAdmin} title="Admin Panel">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.displayName || user.email.split('@')[0]}!
          </h2>
          <p className="text-muted-foreground text-lg">
            Create professional webinars with AI in minutes
          </p>
        </div>

        <div className="mb-8">
          <Button onClick={onCreateWebinar} size="lg" className="bg-primary hover:bg-primary/90">
            <Plus className="h-5 w-5 mr-2" />
            Create New Webinar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Webinars</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedProjects.length} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDuration} min</div>
              <p className="text-xs text-muted-foreground">Across all webinars</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTokensUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Webinars</CardTitle>
            <CardDescription>Your latest webinar projects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No webinars yet</h3>
                <p className="text-muted-foreground mb-4">Create your first webinar to get started</p>
                <Button onClick={onCreateWebinar}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webinar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Video className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{project.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{project.durationMinutes} minutes</span>
                          <span>•</span>
                          <span>Created {formatDate(project.createdAt)}</span>
                          {project.targetAudience && (
                            <>
                              <span>•</span>
                              <span>{project.targetAudience}</span>
                            </>
                          )}
                          {project.tokensUsed > 0 && (
                            <>
                              <span>•</span>
                              <span>{project.tokensUsed} tokens used</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      {project.generationProgress > 0 && project.generationProgress < 100 && (
                        <span className="text-xs text-muted-foreground">
                          {project.generationProgress}%
                        </span>
                      )}
                      {onEditWebinar && (
                        <Button variant="ghost" size="sm" onClick={() => onEditWebinar(project.id)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteWebinar(project.id, project.title)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default Dashboard