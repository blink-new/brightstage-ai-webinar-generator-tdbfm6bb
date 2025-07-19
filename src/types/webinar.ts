export interface WebinarData {
  topic: string
  audience: string
  duration: number
  description: string
  aiTool: string
  title?: string
  outline?: any
  template?: string
  slides?: any[]
  voiceStyle?: string
  ttsProvider?: string
  script?: string
  videoUrl?: string
  pitchVideoUrl?: string
  exportUrls?: any
}

export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  tokensBalance: number
  preferredAiProvider: string
  preferredTtsProvider: string
}

export interface WebinarProject {
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

export interface GeneratedSlide {
  id: string
  type: 'title' | 'content' | 'section-break' | 'conclusion' | 'stats' | 'visual-story'
  title: string
  subtitle?: string
  points?: string[]
  duration: number
  notes: string
  template: any
  style: any
  visual?: string
  cta?: string
  animations?: any[]
  image?: {
    url: string
    alt: string
    caption?: string
    source: 'unsplash' | 'generated' | 'user'
  }
  statistics?: {
    value: string
    label: string
    source?: string
    trend?: 'up' | 'down' | 'stable'
  }[]
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'donut'
    data: any[]
    title: string
  }
  quote?: {
    text: string
    author: string
    role?: string
  }
}