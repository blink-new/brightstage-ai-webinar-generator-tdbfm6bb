import { blink } from '../blink/client'

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay?: number
  backoffMultiplier?: number
}

export interface FallbackOptions {
  enableFallbacks: boolean
  fallbackModel?: string
  fallbackVoice?: string
}

export interface APIHealthCheck {
  available: boolean
  message: string
  services: {
    ai: boolean
    storage: boolean
    auth: boolean
  }
}

export class APIErrorHandler {
  /**
   * Check if APIs are available and healthy
   */
  static async checkAPIHealth(): Promise<APIHealthCheck> {
    const health: APIHealthCheck = {
      available: true,
      message: 'All services operational',
      services: {
        ai: false,
        storage: false,
        auth: false
      }
    }

    try {
      // Check if blink client is available
      if (!blink) {
        health.available = false
        health.message = 'Blink client not initialized'
        return health
      }

      // Check AI service
      try {
        if (blink.ai) {
          health.services.ai = true
        }
      } catch (error) {
        console.warn('AI service check failed:', error)
      }

      // Check storage service
      try {
        if (blink.storage) {
          health.services.storage = true
        }
      } catch (error) {
        console.warn('Storage service check failed:', error)
      }

      // Check auth service
      try {
        if (blink.auth) {
          health.services.auth = true
        }
      } catch (error) {
        console.warn('Auth service check failed:', error)
      }

      // Determine overall availability
      const availableServices = Object.values(health.services).filter(Boolean).length
      if (availableServices === 0) {
        health.available = false
        health.message = 'No services available'
      } else if (availableServices < 3) {
        health.message = `${availableServices}/3 services available`
      }

      return health
    } catch (error) {
      return {
        available: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        services: {
          ai: false,
          storage: false,
          auth: false
        }
      }
    }
  }

  /**
   * Generate text with retry logic and fallbacks
   */
  static async generateTextWithRetry(
    prompt: string,
    options: {
      model?: string
      maxTokens?: number
      retryOptions?: RetryOptions
      fallbackOptions?: FallbackOptions
    } = {}
  ): Promise<string> {
    const {
      model = 'gpt-4o-mini',
      maxTokens = 2000,
      retryOptions = { maxRetries: 3, baseDelay: 1000 },
      fallbackOptions = { enableFallbacks: true }
    } = options

    let lastError: Error | null = null

    // Try with specified model
    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        if (!blink?.ai) {
          throw new Error('AI service not available')
        }

        const { text } = await blink.ai.generateText({
          prompt,
          model,
          maxTokens
        })

        return text
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retryOptions.maxRetries) {
          const delay = Math.min(
            retryOptions.baseDelay * Math.pow(2, attempt),
            retryOptions.maxDelay || 10000
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Try fallback model if enabled
    if (fallbackOptions.enableFallbacks && fallbackOptions.fallbackModel && fallbackOptions.fallbackModel !== model) {
      try {
        console.warn(`Primary model failed, trying fallback: ${fallbackOptions.fallbackModel}`)
        
        const { text } = await blink.ai.generateText({
          prompt,
          model: fallbackOptions.fallbackModel,
          maxTokens
        })

        return text
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError)
      }
    }

    throw new Error(`Text generation failed after ${retryOptions.maxRetries + 1} attempts: ${lastError?.message}`)
  }

  /**
   * Generate speech with retry logic and fallbacks
   */
  static async generateSpeechWithRetry(
    text: string,
    voice: string,
    options: {
      retryOptions?: RetryOptions
      fallbackOptions?: FallbackOptions
    } = {}
  ): Promise<string> {
    const {
      retryOptions = { maxRetries: 3, baseDelay: 1000 },
      fallbackOptions = { enableFallbacks: true, fallbackVoice: 'nova' }
    } = options

    let lastError: Error | null = null

    // Try with specified voice
    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        if (!blink?.ai) {
          throw new Error('AI service not available')
        }

        const { url } = await blink.ai.generateSpeech({
          text,
          voice
        })

        return url
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retryOptions.maxRetries) {
          const delay = Math.min(
            retryOptions.baseDelay * Math.pow(2, attempt),
            retryOptions.maxDelay || 10000
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Try fallback voice if enabled
    if (fallbackOptions.enableFallbacks && fallbackOptions.fallbackVoice && fallbackOptions.fallbackVoice !== voice) {
      try {
        console.warn(`Primary voice failed, trying fallback: ${fallbackOptions.fallbackVoice}`)
        
        const { url } = await blink.ai.generateSpeech({
          text,
          voice: fallbackOptions.fallbackVoice
        })

        return url
      } catch (fallbackError) {
        console.error('Fallback voice also failed:', fallbackError)
      }
    }

    throw new Error(`Speech generation failed after ${retryOptions.maxRetries + 1} attempts: ${lastError?.message}`)
  }

  /**
   * Upload file with retry logic
   */
  static async uploadFileWithRetry(
    file: Blob,
    path: string,
    options: {
      upsert?: boolean
      retryOptions?: RetryOptions
    } = {}
  ): Promise<string> {
    const {
      upsert = true,
      retryOptions = { maxRetries: 3, baseDelay: 1000 }
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        if (!blink?.storage) {
          throw new Error('Storage service not available')
        }

        const { publicUrl } = await blink.storage.upload(file, path, { upsert })
        return publicUrl
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retryOptions.maxRetries) {
          const delay = Math.min(
            retryOptions.baseDelay * Math.pow(2, attempt),
            retryOptions.maxDelay || 10000
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`File upload failed after ${retryOptions.maxRetries + 1} attempts: ${lastError?.message}`)
  }

  /**
   * Get user-friendly error message based on error type
   */
  static getUserFriendlyErrorMessage(error: Error, context: string): string {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return `Network connection issue. Please check your internet connection and try again.`
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return `Service is busy. Please wait a moment and try again.`
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') || message.includes('token')) {
      return `Authentication issue. Please refresh the page and try again.`
    }

    // Service unavailable
    if (message.includes('service unavailable') || message.includes('503') || message.includes('502')) {
      return `Service is temporarily unavailable. Please try again in a few minutes.`
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return `Request timed out. Please try again with a shorter request.`
    }

    // Content/input errors
    if (message.includes('invalid') || message.includes('malformed') || message.includes('bad request')) {
      return `Invalid input provided. Please check your content and try again.`
    }

    // Quota/limit errors
    if (message.includes('quota') || message.includes('limit exceeded') || message.includes('insufficient')) {
      return `Usage limit reached. Please upgrade your plan or try again later.`
    }

    // File/upload errors
    if (message.includes('file') || message.includes('upload') || message.includes('storage')) {
      return `File processing failed. Please try with a different file or smaller size.`
    }

    // AI/generation specific errors
    if (context.includes('Generation') || context.includes('AI')) {
      if (message.includes('model') || message.includes('ai')) {
        return `AI service is temporarily unavailable. Please try again in a moment.`
      }
      if (message.includes('content') || message.includes('prompt')) {
        return `Content generation failed. Please try with different input or try again.`
      }
    }

    // Video generation specific
    if (context.includes('Video')) {
      return `Video generation failed. This may be due to high demand. Please try again or use different settings.`
    }

    // Slide generation specific
    if (context.includes('Slide')) {
      return `Slide generation failed. Please check your content and try again.`
    }

    // Generic fallback
    return `${context} failed. Please try again or contact support if the issue persists.`
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // Don't retry these errors
    const nonRetryableErrors = [
      'unauthorized',
      'forbidden',
      'invalid',
      'malformed',
      'bad request',
      'not found',
      'quota exceeded',
      'limit exceeded'
    ]

    return !nonRetryableErrors.some(nonRetryable => message.includes(nonRetryable))
  }

  /**
   * Wrap any async function with error handling and retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      retryOptions?: RetryOptions
      context?: string
    } = {}
  ): Promise<T> {
    const {
      retryOptions = { maxRetries: 3, baseDelay: 1000 },
      context = 'Operation'
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry if error is not retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError
        }
        
        if (attempt < retryOptions.maxRetries) {
          const delay = Math.min(
            retryOptions.baseDelay * Math.pow(2, attempt),
            retryOptions.maxDelay || 10000
          )
          console.warn(`${context} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`${context} failed after ${retryOptions.maxRetries + 1} attempts: ${lastError?.message}`)
  }
}