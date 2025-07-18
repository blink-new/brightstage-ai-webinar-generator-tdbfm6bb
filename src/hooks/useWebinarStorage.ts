import { useState, useEffect } from 'react'
import { WebinarData } from '../components/WebinarCreator'

export interface StoredWebinar extends WebinarData {
  id: string
  userId: string
  status: 'draft' | 'generating' | 'completed'
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'brightstage_webinars'

export function useWebinarStorage(userId: string) {
  const [webinars, setWebinars] = useState<StoredWebinar[]>([])
  const [loading, setLoading] = useState(true)

  // Load webinars from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const allWebinars: StoredWebinar[] = JSON.parse(stored)
        const userWebinars = allWebinars.filter(w => w.userId === userId)
        setWebinars(userWebinars)
      }
    } catch (error) {
      console.error('Failed to load webinars from storage:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Save webinars to localStorage whenever webinars change
  useEffect(() => {
    if (!loading) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const allWebinars: StoredWebinar[] = stored ? JSON.parse(stored) : []
        
        // Remove old webinars for this user and add current ones
        const otherUsersWebinars = allWebinars.filter(w => w.userId !== userId)
        const updatedWebinars = [...otherUsersWebinars, ...webinars]
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWebinars))
      } catch (error) {
        console.error('Failed to save webinars to storage:', error)
      }
    }
  }, [webinars, userId, loading])

  const saveWebinar = (webinarData: WebinarData, id?: string): StoredWebinar => {
    const now = new Date().toISOString()
    const webinarId = id || `webinar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const storedWebinar: StoredWebinar = {
      ...webinarData,
      id: webinarId,
      userId,
      status: determineStatus(webinarData),
      createdAt: id ? webinars.find(w => w.id === id)?.createdAt || now : now,
      updatedAt: now
    }

    setWebinars(prev => {
      const existing = prev.findIndex(w => w.id === webinarId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = storedWebinar
        return updated
      } else {
        return [...prev, storedWebinar]
      }
    })

    return storedWebinar
  }

  const deleteWebinar = (id: string) => {
    setWebinars(prev => prev.filter(w => w.id !== id))
  }

  const getWebinar = (id: string): StoredWebinar | undefined => {
    return webinars.find(w => w.id === id)
  }

  const updateWebinarStatus = (id: string, status: StoredWebinar['status']) => {
    setWebinars(prev => prev.map(w => 
      w.id === id 
        ? { ...w, status, updatedAt: new Date().toISOString() }
        : w
    ))
  }

  return {
    webinars,
    loading,
    saveWebinar,
    deleteWebinar,
    getWebinar,
    updateWebinarStatus
  }
}

function determineStatus(data: WebinarData): StoredWebinar['status'] {
  if (data.videoUrl) return 'completed'
  if (data.slides && data.script) return 'generating'
  return 'draft'
}