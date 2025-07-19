import type { WebinarData } from '../types/webinar'

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

/**
 * Utility class for converting between WebinarData and WebinarProject formats
 */
export class WebinarDataConverter {
  /**
   * Convert WebinarData to WebinarProject format for database storage
   */
  static toProject(data: WebinarData, userId: string): Partial<WebinarProject> {
    const now = new Date().toISOString()
    
    return {
      userId,
      title: data.title || data.topic || 'Untitled Webinar',
      topic: data.topic || '',
      targetAudience: data.audience || '',
      durationMinutes: data.duration || 60,
      description: data.description || '',
      aiTool: data.aiTool || 'openai',
      status: this.determineStatus(data),
      generationProgress: this.calculateProgress(data),
      tokensUsed: 0, // Will be updated separately
      outline: data.outline,
      template: data.template,
      slides: data.slides,
      voiceStyle: data.voiceStyle,
      ttsProvider: data.ttsProvider,
      script: data.script,
      videoUrl: data.videoUrl,
      exportUrls: data.exportUrls,
      updatedAt: now
    }
  }

  /**
   * Convert WebinarProject to WebinarData format for UI components
   */
  static fromProject(project: WebinarProject): WebinarData {
    return {
      topic: project.topic,
      audience: project.targetAudience,
      duration: project.durationMinutes,
      description: project.description,
      aiTool: project.aiTool,
      title: project.title,
      outline: project.outline,
      template: project.template,
      slides: project.slides,
      voiceStyle: project.voiceStyle,
      ttsProvider: project.ttsProvider,
      script: project.script,
      videoUrl: project.videoUrl,
      pitchVideoUrl: undefined, // Not stored in project
      exportUrls: project.exportUrls
    }
  }

  /**
   * Merge WebinarData updates with existing data
   */
  static merge(existing: WebinarData, updates: Partial<WebinarData>): WebinarData {
    return {
      ...existing,
      ...updates,
      // Ensure required fields are never undefined
      topic: updates.topic ?? existing.topic,
      audience: updates.audience ?? existing.audience,
      duration: updates.duration ?? existing.duration,
      description: updates.description ?? existing.description,
      aiTool: updates.aiTool ?? existing.aiTool
    }
  }

  /**
   * Determine project status based on WebinarData completeness
   */
  private static determineStatus(data: WebinarData): 'draft' | 'generating' | 'completed' | 'failed' {
    if (data.videoUrl) {
      return 'completed'
    }
    
    if (data.script && data.slides && data.slides.length > 0) {
      return 'generating' // Ready for video generation
    }
    
    if (data.outline) {
      return 'generating' // Content generated, working on slides
    }
    
    return 'draft'
  }

  /**
   * Calculate generation progress based on completed steps
   */
  private static calculateProgress(data: WebinarData): number {
    let progress = 0
    
    // Step 1: Content input (25%)
    if (data.topic && data.audience && data.description) {
      progress += 25
    }
    
    // Step 2: Content generation (25%)
    if (data.outline) {
      progress += 25
    }
    
    // Step 3: Slide generation (25%)
    if (data.slides && data.slides.length > 0) {
      progress += 25
    }
    
    // Step 4: Video generation (25%)
    if (data.videoUrl) {
      progress += 25
    }
    
    return progress
  }

  /**
   * Validate WebinarData for completeness
   */
  static validate(data: WebinarData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.topic || data.topic.trim().length === 0) {
      errors.push('Topic is required')
    }
    
    if (!data.audience || data.audience.trim().length === 0) {
      errors.push('Target audience is required')
    }
    
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required')
    }
    
    if (!data.duration || data.duration <= 0) {
      errors.push('Duration must be greater than 0')
    }
    
    if (data.duration && data.duration > 180) {
      errors.push('Duration cannot exceed 180 minutes')
    }
    
    if (!data.aiTool) {
      errors.push('AI tool selection is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Sanitize WebinarData for safe storage
   */
  static sanitize(data: WebinarData): WebinarData {
    return {
      topic: this.sanitizeString(data.topic),
      audience: this.sanitizeString(data.audience),
      duration: Math.max(1, Math.min(180, data.duration || 60)),
      description: this.sanitizeString(data.description),
      aiTool: this.sanitizeString(data.aiTool) || 'openai',
      title: data.title ? this.sanitizeString(data.title) : undefined,
      outline: this.sanitizeObject(data.outline),
      template: data.template ? this.sanitizeString(data.template) : undefined,
      slides: Array.isArray(data.slides) ? data.slides.map(slide => this.sanitizeObject(slide)) : undefined,
      voiceStyle: data.voiceStyle ? this.sanitizeString(data.voiceStyle) : undefined,
      ttsProvider: data.ttsProvider ? this.sanitizeString(data.ttsProvider) : undefined,
      script: data.script ? this.sanitizeString(data.script) : undefined,
      videoUrl: data.videoUrl ? this.sanitizeUrl(data.videoUrl) : undefined,
      pitchVideoUrl: data.pitchVideoUrl ? this.sanitizeUrl(data.pitchVideoUrl) : undefined,
      exportUrls: this.sanitizeObject(data.exportUrls)
    }
  }

  /**
   * Sanitize string input
   */
  private static sanitizeString(input: string | undefined): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    return input
      .trim()
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        }
        return entities[char] || char
      })
      .substring(0, 10000) // Limit length
  }

  /**
   * Sanitize URL input
   */
  private static sanitizeUrl(input: string | undefined): string | undefined {
    if (!input || typeof input !== 'string') {
      return undefined
    }
    
    try {
      const url = new URL(input)
      // Only allow HTTPS and data URLs
      if (['https:', 'data:'].includes(url.protocol)) {
        return input
      }
    } catch {
      // Invalid URL
    }
    
    return undefined
  }

  /**
   * Sanitize object input
   */
  private static sanitizeObject(input: any): any {
    if (!input || typeof input !== 'object') {
      return undefined
    }
    
    try {
      // Convert to JSON and back to remove any functions or unsafe content
      const jsonString = JSON.stringify(input)
      
      // Check for potentially dangerous content
      const dangerousPatterns = [
        'javascript:',
        'data:text/html',
        '<script',
        'eval(',
        'function(',
        '__proto__',
        'constructor'
      ]
      
      if (dangerousPatterns.some(pattern => jsonString.toLowerCase().includes(pattern))) {
        console.warn('Potentially dangerous content detected in object, sanitizing')
        return {}
      }
      
      return JSON.parse(jsonString)
    } catch {
      return {}
    }
  }

  /**
   * Create a minimal WebinarData object with defaults
   */
  static createDefault(): WebinarData {
    return {
      topic: '',
      audience: '',
      duration: 60,
      description: '',
      aiTool: 'openai'
    }
  }

  /**
   * Check if WebinarData is ready for next step
   */
  static isReadyForStep(data: WebinarData, step: number): boolean {
    switch (step) {
      case 1: // Content input
        return true // Always ready for first step
      
      case 2: // Slide design
        return !!(data.topic && data.audience && data.description && data.outline)
      
      case 3: // Voice & video
        return !!(data.slides && data.slides.length > 0)
      
      case 4: // Export
        return !!(data.videoUrl)
      
      default:
        return false
    }
  }

  /**
   * Get completion percentage for progress display
   */
  static getCompletionPercentage(data: WebinarData): number {
    return this.calculateProgress(data)
  }

  /**
   * Get next recommended step
   */
  static getNextStep(data: WebinarData): number {
    if (!data.topic || !data.audience || !data.description) {
      return 1
    }
    
    if (!data.outline) {
      return 1 // Stay on step 1 until content is generated
    }
    
    if (!data.slides || data.slides.length === 0) {
      return 2
    }
    
    if (!data.script || !data.videoUrl) {
      return 3
    }
    
    return 4 // Export step
  }

  /**
   * Estimate tokens that will be consumed
   */
  static estimateTokenUsage(data: WebinarData): number {
    let tokens = 0
    
    // Content generation
    if (data.description) {
      tokens += Math.ceil(data.description.length / 4) // Rough estimate: 4 chars per token
    }
    
    // Slide generation
    if (data.slides) {
      tokens += data.slides.length * 50 // Estimate 50 tokens per slide
    }
    
    // Script generation
    if (data.script) {
      tokens += Math.ceil(data.script.length / 4)
    }
    
    // Voice generation (estimated based on script length)
    if (data.script) {
      tokens += Math.ceil(data.script.length / 10) // TTS typically uses fewer tokens
    }
    
    return tokens
  }
}