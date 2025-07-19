import { blink } from '../blink/client'

interface AnalyticsEvent {
  eventType: string
  eventData?: Record<string, any>
  userId?: string
  sessionId?: string
}

class AnalyticsService {
  private sessionId: string
  private userId: string | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeSession()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeSession() {
    try {
      // Track session start
      await this.track('session_start', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      })
    } catch (error) {
      console.warn('Failed to initialize analytics session:', error)
    }
  }

  setUserId(userId: string) {
    this.userId = userId
    this.track('user_identified', { userId })
  }

  async track(eventType: string, eventData: Record<string, any> = {}) {
    try {
      const event: AnalyticsEvent = {
        eventType,
        eventData: {
          ...eventData,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          sessionId: this.sessionId
        },
        userId: this.userId,
        sessionId: this.sessionId
      }

      // Store in Supabase
      await blink.db.usageAnalytics.create({
        id: `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId,
        eventType,
        eventData: event.eventData,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent
      })

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics Event:', event)
      }
    } catch (error) {
      console.warn('Failed to track analytics event:', error)
    }
  }

  // Specific tracking methods for common events
  async trackWebinarCreated(projectId: string, data: any) {
    await this.track('webinar_created', {
      projectId,
      title: data.title,
      duration: data.duration,
      targetAudience: data.targetAudience
    })
  }

  async trackContentGenerated(projectId: string, provider: string, tokensUsed: number) {
    await this.track('content_generated', {
      projectId,
      aiProvider: provider,
      tokensUsed
    })
  }

  async trackSlidesGenerated(projectId: string, slideCount: number, template: string) {
    await this.track('slides_generated', {
      projectId,
      slideCount,
      template
    })
  }

  async trackVoiceGenerated(projectId: string, provider: string, duration: number) {
    await this.track('voice_generated', {
      projectId,
      ttsProvider: provider,
      duration
    })
  }

  async trackVideoGenerated(projectId: string, duration: number, fileSize: number) {
    await this.track('video_generated', {
      projectId,
      duration,
      fileSize
    })
  }

  async trackExport(projectId: string, format: string) {
    await this.track('webinar_exported', {
      projectId,
      format
    })
  }

  async trackTokenPurchase(packageId: string, tokens: number, price: number) {
    await this.track('tokens_purchased', {
      packageId,
      tokens,
      price
    })
  }

  async trackError(error: string, context: any) {
    await this.track('error_occurred', {
      error,
      context,
      stack: new Error().stack
    })
  }

  async trackPageView(page: string) {
    await this.track('page_view', {
      page,
      timestamp: new Date().toISOString()
    })
  }

  async trackFeatureUsage(feature: string, data: any = {}) {
    await this.track('feature_used', {
      feature,
      ...data
    })
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

// Export class for testing
export { AnalyticsService }