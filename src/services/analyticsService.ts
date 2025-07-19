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
  private isEnabled: boolean = true
  private eventQueue: AnalyticsEvent[] = []
  private flushTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeSession()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeSession() {
    try {
      // Only track session start if analytics is enabled
      if (this.isEnabled) {
        await this.track('session_start', {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer
        })
      }
    } catch (error) {
      console.warn('Failed to initialize analytics session:', error)
      // Disable analytics if initialization fails
      this.isEnabled = false
    }
  }

  setUserId(userId: string) {
    this.userId = userId
    if (this.isEnabled) {
      this.track('user_identified', { userId }).catch(() => {
        // Silently fail if analytics tracking fails
      })
    }
  }

  disable() {
    this.isEnabled = false
    this.eventQueue = []
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout)
      this.flushTimeout = null
    }
  }

  enable() {
    this.isEnabled = true
  }

  async track(eventType: string, eventData: Record<string, any> = {}) {
    if (!this.isEnabled) {
      return // Silently skip if analytics is disabled
    }

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

      // Add to queue for batch processing
      this.eventQueue.push(event)

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics Event:', event)
      }

      // Schedule flush if not already scheduled
      if (!this.flushTimeout) {
        this.flushTimeout = setTimeout(() => {
          this.flush()
        }, 1000) // Batch events for 1 second
      }

    } catch (error) {
      console.warn('Failed to track analytics event:', error)
      // Don't throw error to prevent breaking the app
    }
  }

  private async flush() {
    if (!this.isEnabled || this.eventQueue.length === 0) {
      return
    }

    const eventsToSend = [...this.eventQueue]
    this.eventQueue = []
    this.flushTimeout = null

    try {
      // Try to use Blink SDK analytics if available
      if (blink?.analytics?.log) {
        for (const event of eventsToSend) {
          try {
            blink.analytics.log(event.eventType, event.eventData)
          } catch (error) {
            console.warn('Failed to send analytics event via Blink SDK:', error)
            // If Blink analytics fails, disable it to prevent future errors
            this.isEnabled = false
            break
          }
        }
      } else {
        // Fallback: just log to console
        console.log('Analytics events (Blink SDK not available):', eventsToSend)
      }
    } catch (error) {
      console.warn('Failed to flush analytics events:', error)
      // Disable analytics on persistent failures
      this.isEnabled = false
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