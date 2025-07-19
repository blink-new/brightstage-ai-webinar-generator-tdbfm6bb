import { useState, useEffect } from 'react'
import { db } from '../blink/client'

interface WebinarProject {
  id: string
  userId: string
  title: string
  topic: string
  targetAudience: string
  durationMinutes: number
  description: string
  aiTool: string
  status: 'draft' | 'generating' | 'completed' | 'failed'
  generationProgress: number
  tokensUsed: number
  outline?: any
  template?: string
  slides?: any[]
  voiceStyle?: string
  ttsProvider?: string
  script?: string
  videoUrl?: string
  exportUrls?: any
  createdAt: string
  updatedAt: string
}

export function useWebinarProject(userId?: string) {
  const [projects, setProjects] = useState<WebinarProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = async () => {
    if (!userId) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const projectsData = await db.webinarProjects.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 100
      })
      
      setProjects(projectsData)
    } catch (err) {
      console.error('Error loading webinar projects:', err)
      setError('Failed to load webinar projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const createProject = async (projectData: Partial<WebinarProject>): Promise<WebinarProject> => {
    if (!userId) throw new Error('User ID is required')

    const newProject = {
      id: `webinar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: projectData.title || 'Untitled Webinar',
      topic: projectData.topic || '',
      targetAudience: projectData.targetAudience || '',
      durationMinutes: projectData.durationMinutes || 60,
      description: projectData.description || '',
      aiTool: projectData.aiTool || 'openai',
      status: 'draft' as const,
      generationProgress: 0,
      tokensUsed: 0,
      outline: projectData.outline,
      template: projectData.template,
      slides: projectData.slides,
      voiceStyle: projectData.voiceStyle,
      ttsProvider: projectData.ttsProvider,
      script: projectData.script,
      videoUrl: projectData.videoUrl,
      exportUrls: projectData.exportUrls
    }

    try {
      const createdProject = await db.webinarProjects.create(newProject)
      
      // Add to local state
      setProjects(prev => [createdProject, ...prev])
      
      return createdProject
    } catch (err) {
      console.error('Error creating webinar project:', err)
      throw new Error('Failed to create webinar project')
    }
  }

  const updateProject = async (projectId: string, updates: Partial<WebinarProject>): Promise<WebinarProject> => {
    try {
      const updatedProject = await db.webinarProjects.update(projectId, updates)
      
      // Update local state
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, ...updates, updatedAt: new Date().toISOString() }
            : project
        )
      )
      
      return updatedProject
    } catch (err) {
      console.error('Error updating webinar project:', err)
      throw new Error('Failed to update webinar project')
    }
  }

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await db.webinarProjects.delete(projectId)
      
      // Remove from local state
      setProjects(prev => prev.filter(project => project.id !== projectId))
    } catch (err) {
      console.error('Error deleting webinar project:', err)
      throw new Error('Failed to delete webinar project')
    }
  }

  const getProject = (projectId: string): WebinarProject | undefined => {
    return projects.find(project => project.id === projectId)
  }

  const updateProjectProgress = async (projectId: string, progress: number, status?: WebinarProject['status']) => {
    const updates: Partial<WebinarProject> = { generationProgress: progress }
    if (status) updates.status = status
    
    try {
      await updateProject(projectId, updates)
    } catch (err) {
      console.error('Error updating project progress:', err)
    }
  }

  const addTokenUsage = async (projectId: string, tokensUsed: number) => {
    const project = getProject(projectId)
    if (!project) return

    const newTokensUsed = (project.tokensUsed || 0) + tokensUsed
    
    try {
      await updateProject(projectId, { tokensUsed: newTokensUsed })
    } catch (err) {
      console.error('Error updating token usage:', err)
    }
  }

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    updateProjectProgress,
    addTokenUsage,
    refreshProjects: loadProjects
  }
}