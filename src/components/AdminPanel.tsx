import { useState, useEffect, useCallback } from 'react'
import { Users, BarChart3, Settings, Database, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { useToast } from '../hooks/use-toast'

interface User {
  id: string
  email: string
  displayName?: string
  createdAt: string
  lastActive: string
  webinarCount: number
  tokenUsage: number
  status: 'active' | 'inactive' | 'suspended'
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalWebinars: number
  totalTokensUsed: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  uptime: string
}

interface AdminPanelProps {
  user: {
    id: string
    email: string
    displayName?: string
  }
  onBack: () => void
}

function AdminPanel({ user, onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalWebinars: 0,
    totalTokensUsed: 0,
    systemHealth: 'healthy',
    uptime: '99.9%'
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  const loadAdminData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock admin data - in a real app, this would come from your backend
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'john@example.com',
          displayName: 'John Doe',
          createdAt: '2024-01-15',
          lastActive: '2024-01-20',
          webinarCount: 5,
          tokenUsage: 2500,
          status: 'active'
        },
        {
          id: '2',
          email: 'jane@company.com',
          displayName: 'Jane Smith',
          createdAt: '2024-01-10',
          lastActive: '2024-01-19',
          webinarCount: 12,
          tokenUsage: 8900,
          status: 'active'
        },
        {
          id: '3',
          email: 'bob@startup.io',
          displayName: 'Bob Wilson',
          createdAt: '2024-01-05',
          lastActive: '2024-01-18',
          webinarCount: 3,
          tokenUsage: 1200,
          status: 'inactive'
        }
      ]

      const mockStats: SystemStats = {
        totalUsers: mockUsers.length,
        activeUsers: mockUsers.filter(u => u.status === 'active').length,
        totalWebinars: mockUsers.reduce((sum, u) => sum + u.webinarCount, 0),
        totalTokensUsed: mockUsers.reduce((sum, u) => sum + u.tokenUsage, 0),
        systemHealth: 'healthy',
        uptime: '99.9%'
      }

      setUsers(mockUsers)
      setStats(mockStats)
    } catch (error) {
      toast({
        title: 'Failed to load admin data',
        description: 'Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, status: action === 'suspend' ? 'suspended' : action === 'activate' ? 'active' : u.status }
        : u
    ).filter(u => action !== 'delete' || u.id !== userId))

    toast({
      title: `User ${action}d successfully`,
      description: `The user has been ${action}d.`
    })
  }

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: SystemStats['systemHealth']) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: SystemStats['systemHealth']) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />
      case 'warning': return <AlertTriangle className="h-5 w-5" />
      case 'critical': return <AlertTriangle className="h-5 w-5" />
      default: return <Activity className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BS</span>
                </div>
                <span className="text-xl font-bold text-primary">BrightStage AI</span>
              </div>
              <div className="h-6 w-px bg-border"></div>
              <h1 className="text-xl font-semibold">Admin Panel</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${getHealthColor(stats.systemHealth)}`}>
                {getHealthIcon(stats.systemHealth)}
                <span className="text-sm font-medium capitalize">{stats.systemHealth}</span>
              </div>
              <Button variant="outline" onClick={onBack}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active users
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Webinars</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWebinars}</div>
              <p className="text-xs text-muted-foreground">
                Generated this month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokensUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Tokens consumed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uptime}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and monitor activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{user.displayName || user.email}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{user.email}</span>
                            <span>•</span>
                            <span>{user.webinarCount} webinars</span>
                            <span>•</span>
                            <span>{user.tokenUsage.toLocaleString()} tokens</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                        <div className="flex space-x-2">
                          {user.status === 'active' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUserAction(user.id, 'suspend')}
                            >
                              Suspend
                            </Button>
                          )}
                          {user.status === 'suspended' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUserAction(user.id, 'activate')}
                            >
                              Activate
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Analytics</CardTitle>
                  <CardDescription>
                    Platform usage metrics and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Daily Active Users</span>
                        <span>85%</span>
                      </div>
                      <Progress value={85} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Webinar Completion Rate</span>
                        <span>92%</span>
                      </div>
                      <Progress value={92} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Token Efficiency</span>
                        <span>78%</span>
                      </div>
                      <Progress value={78} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Features</CardTitle>
                  <CardDescription>
                    Most used features and templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Content Generation</span>
                      <Badge variant="secondary">95%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Modern Business Template</span>
                      <Badge variant="secondary">78%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Voice Synthesis</span>
                      <Badge variant="secondary">65%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Video Generation</span>
                      <Badge variant="secondary">52%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>
                    Current system health and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">API Services</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Database</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">AI Services</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Video Processing</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    System performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>CPU Usage</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Memory Usage</span>
                        <span>62%</span>
                      </div>
                      <Progress value={62} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Storage Usage</span>
                        <span>38%</span>
                      </div>
                      <Progress value={38} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Response Time</span>
                        <span>125ms</span>
                      </div>
                      <Progress value={75} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">AI Configuration</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Default AI Model</span>
                          <Badge variant="outline">GPT-4o-mini</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Max Tokens per Request</span>
                          <Badge variant="outline">4000</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Rate Limiting</span>
                          <Badge variant="outline">100/hour</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">System Limits</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Max Webinar Duration</span>
                          <Badge variant="outline">120 min</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Max Slides per Webinar</span>
                          <Badge variant="outline">50</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Video Quality</span>
                          <Badge variant="outline">1080p</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <div className="flex space-x-4">
                      <Button>Save Settings</Button>
                      <Button variant="outline">Reset to Defaults</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default AdminPanel