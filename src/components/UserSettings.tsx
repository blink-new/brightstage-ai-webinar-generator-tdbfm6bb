import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { 
  User, 
  Settings, 
  CreditCard, 
  Bell, 
  Shield, 
  Download,
  Trash2,
  Save,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ui/use-toast'
import { blink } from '../blink/client'
import { analytics } from '../services/analyticsService'

interface UserSettingsProps {
  onClose: () => void
}

interface UserPreferences {
  emailNotifications: boolean
  marketingEmails: boolean
  weeklyReports: boolean
  preferredAiProvider: string
  preferredTtsProvider: string
  autoSaveInterval: number
  defaultWebinarDuration: number
}

export const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const { user, updateTokenBalance } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    marketingEmails: false,
    weeklyReports: true,
    preferredAiProvider: 'openai',
    preferredTtsProvider: 'elevenlabs',
    autoSaveInterval: 30,
    defaultWebinarDuration: 60
  })
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || ''
  })
  const [usageStats, setUsageStats] = useState({
    totalWebinars: 0,
    totalTokensUsed: 0,
    storageUsed: 0,
    lastLogin: ''
  })

  useEffect(() => {
    if (!user) return
    
    const initializeSettings = async () => {
      await loadUserPreferences()
      await loadUsageStats()
      analytics.trackPageView('user_settings')
    }
    initializeSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadUserPreferences = async () => {
    if (!user) return

    try {
      const userPrefs = await blink.db.userPreferences.list({
        where: { userId: user.id },
        limit: 1
      })

      if (userPrefs.length > 0) {
        const prefs = userPrefs[0]
        setPreferences({
          emailNotifications: Boolean(Number(prefs.emailNotifications)),
          marketingEmails: Boolean(Number(prefs.marketingEmails)),
          weeklyReports: Boolean(Number(prefs.weeklyReports)),
          preferredAiProvider: prefs.preferredAiProvider || 'openai',
          preferredTtsProvider: prefs.preferredTtsProvider || 'elevenlabs',
          autoSaveInterval: Number(prefs.autoSaveInterval) || 30,
          defaultWebinarDuration: Number(prefs.defaultWebinarDuration) || 60
        })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const loadUsageStats = async () => {
    if (!user) return

    try {
      // Load webinar projects
      const projects = await blink.db.webinarProjects.list({
        where: { userId: user.id },
        limit: 1000
      })

      // Load token transactions
      const transactions = await blink.db.tokenTransactions.list({
        where: { 
          userId: user.id,
          transactionType: 'usage'
        },
        limit: 1000
      })

      const totalTokensUsed = transactions.reduce((sum, t) => sum + Math.abs(Number(t.tokensAmount)), 0)

      setUsageStats({
        totalWebinars: projects.length,
        totalTokensUsed,
        storageUsed: projects.length * 50, // Estimate 50MB per webinar
        lastLogin: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading usage stats:', error)
    }
  }

  const savePreferences = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Update user preferences
      const existingPrefs = await blink.db.userPreferences.list({
        where: { userId: user.id },
        limit: 1
      })

      const prefData = {
        userId: user.id,
        emailNotifications: preferences.emailNotifications ? "1" : "0",
        marketingEmails: preferences.marketingEmails ? "1" : "0",
        weeklyReports: preferences.weeklyReports ? "1" : "0",
        preferredAiProvider: preferences.preferredAiProvider,
        preferredTtsProvider: preferences.preferredTtsProvider,
        autoSaveInterval: preferences.autoSaveInterval,
        defaultWebinarDuration: preferences.defaultWebinarDuration
      }

      if (existingPrefs.length > 0) {
        await blink.db.userPreferences.update(existingPrefs[0].id, prefData)
      } else {
        await blink.db.userPreferences.create({
          id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...prefData
        })
      }

      // Update user profile
      await blink.db.users.update(user.id, {
        displayName: profileData.displayName,
        preferredAiProvider: preferences.preferredAiProvider,
        preferredTtsProvider: preferences.preferredTtsProvider
      })

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully."
      })

      analytics.trackFeatureUsage('settings_saved', preferences)
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (!user) return

    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your webinars, data, and settings.'
    )

    if (!confirmed) return

    try {
      setLoading(true)
      
      // Delete user data (cascade will handle related records)
      await blink.db.users.delete(user.id)
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted."
      })

      analytics.trackFeatureUsage('account_deleted')
      
      // Redirect to logout
      window.location.href = '/'
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Gather all user data
      const [projects, transactions, userPrefs, analytics] = await Promise.all([
        blink.db.webinarProjects.list({ where: { userId: user.id }, limit: 1000 }),
        blink.db.tokenTransactions.list({ where: { userId: user.id }, limit: 1000 }),
        blink.db.userPreferences.list({ where: { userId: user.id }, limit: 1 }),
        blink.db.usageAnalytics.list({ where: { userId: user.id }, limit: 1000 })
      ])

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          tokensBalance: user.tokensBalance,
          createdAt: new Date().toISOString()
        },
        webinarProjects: projects,
        tokenTransactions: transactions,
        preferences: userPrefs[0] || {},
        analytics: analytics,
        exportedAt: new Date().toISOString()
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brightstage-data-${user.id}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a JSON file."
      })

      analytics.trackFeatureUsage('data_exported')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profileData.displayName}
                onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your display name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profileData.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline">
              {user?.tokensBalance?.toLocaleString() || 0} tokens
            </Badge>
            <Badge variant={user?.plan === 'free' ? 'secondary' : 'default'}>
              {user?.plan || 'free'} plan
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>AI Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aiProvider">Preferred AI Provider</Label>
              <Select 
                value={preferences.preferredAiProvider} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, preferredAiProvider: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ttsProvider">Preferred Voice Provider</Label>
              <Select 
                value={preferences.preferredTtsProvider} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, preferredTtsProvider: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="openai">OpenAI TTS</SelectItem>
                  <SelectItem value="google">Google Cloud TTS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="autoSave">Auto-save Interval (seconds)</Label>
              <Select 
                value={preferences.autoSaveInterval.toString()} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, autoSaveInterval: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="defaultDuration">Default Webinar Duration (minutes)</Label>
              <Select 
                value={preferences.defaultWebinarDuration.toString()} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, defaultWebinarDuration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications about webinar completion</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weeklyReports">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">Get weekly usage and analytics reports</p>
            </div>
            <Switch
              id="weeklyReports"
              checked={preferences.weeklyReports}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, weeklyReports: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketingEmails">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">Receive updates about new features and tips</p>
            </div>
            <Switch
              id="marketingEmails"
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketingEmails: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Usage Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{usageStats.totalWebinars}</div>
              <div className="text-sm text-muted-foreground">Webinars Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{usageStats.totalTokensUsed.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Tokens Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{usageStats.storageUsed} MB</div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{user?.tokensBalance?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Tokens Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Data & Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Export Your Data</Label>
              <p className="text-sm text-muted-foreground">Download all your data in JSON format</p>
            </div>
            <Button variant="outline" onClick={exportData} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-red-600">Delete Account</Label>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}