import { blink } from '../blink/client'

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export interface FallbackOptions {
  enableFallbacks: boolean
  fallbackProviders: string[]
  fallbackQuality: 'low' | 'medium' | 'high'
}

export class APIErrorHandler {
  private static defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }

  private static defaultFallbackOptions: FallbackOptions = {
    enableFallbacks: true,
    fallbackProviders: ['openai', 'google', 'azure'],
    fallbackQuality: 'medium'
  }

  /**
   * Execute API call with retry logic and fallbacks
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryOptions: Partial<RetryOptions> = {},
    fallbackOptions: Partial<FallbackOptions> = {}
  ): Promise<T> {
    const options = { ...this.defaultRetryOptions, ...retryOptions }
    const fallbacks = { ...this.defaultFallbackOptions, ...fallbackOptions }
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        console.log(`${operationName}: Attempt ${attempt}/${options.maxRetries}`)
        
        const result = await operation()
        
        if (attempt > 1) {
          console.log(`${operationName}: Succeeded on attempt ${attempt}`)
        }
        
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        console.warn(`${operationName}: Attempt ${attempt} failed:`, lastError.message)
        
        // Check if this is a retryable error
        if (!this.isRetryableError(lastError)) {
          console.log(`${operationName}: Non-retryable error, stopping retries`)
          break
        }
        
        // If this is the last attempt, don't wait
        if (attempt === options.maxRetries) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1),
          options.maxDelay
        )
        
        console.log(`${operationName}: Waiting ${delay}ms before retry...`)
        await this.delay(delay)
      }
    }
    
    // All retries failed, try fallbacks if enabled
    if (fallbacks.enableFallbacks) {
      console.log(`${operationName}: All retries failed, attempting fallbacks...`)
      try {
        return await this.executeFallback(operationName, lastError, fallbacks)
      } catch (fallbackError) {
        console.error(`${operationName}: Fallbacks also failed:`, fallbackError)
        throw new Error(`${operationName} failed after ${options.maxRetries} retries and fallback attempts: ${lastError?.message}`)
      }
    }
    
    throw new Error(`${operationName} failed after ${options.maxRetries} retries: ${lastError?.message}`)
  }

  /**
   * Generate speech with retry and fallback logic
   */
  static async generateSpeechWithRetry(
    text: string,
    voice: string = 'nova',
    options: { retryOptions?: Partial<RetryOptions>; fallbackOptions?: Partial<FallbackOptions> } = {}
  ): Promise<string> {
    return this.executeWithRetry(
      async () => {
        if (!blink) {
          throw new Error('Blink client not available')
        }
        
        const { url } = await blink.ai.generateSpeech({
          text: text.substring(0, 4000), // Limit text length to prevent API errors
          voice,
          model: 'tts-1-hd'
        })
        
        if (!url || typeof url !== 'string') {
          throw new Error('Invalid audio URL returned from API')
        }
        
        return url
      },
      'Speech Generation',
      options.retryOptions,
      options.fallbackOptions
    )
  }

  /**
   * Generate text with retry and fallback logic
   */
  static async generateTextWithRetry(
    prompt: string,
    options: { 
      model?: string
      maxTokens?: number
      retryOptions?: Partial<RetryOptions>
      fallbackOptions?: Partial<FallbackOptions>
    } = {}
  ): Promise<string> {
    return this.executeWithRetry(
      async () => {
        if (!blink) {
          throw new Error('Blink client not available')
        }
        
        const { text } = await blink.ai.generateText({
          prompt: prompt.substring(0, 8000), // Limit prompt length
          model: options.model || 'gpt-4o-mini',
          maxTokens: options.maxTokens || 2000
        })
        
        if (!text || typeof text !== 'string') {
          throw new Error('Invalid text returned from API')
        }
        
        return text
      },
      'Text Generation',
      options.retryOptions,
      options.fallbackOptions
    )
  }

  /**
   * Upload file with retry logic
   */
  static async uploadFileWithRetry(
    file: Blob,
    path: string,
    options: { 
      upsert?: boolean
      retryOptions?: Partial<RetryOptions>
    } = {}
  ): Promise<string> {
    return this.executeWithRetry(
      async () => {
        if (!blink) {
          throw new Error('Blink client not available')
        }
        
        if (!file || file.size === 0) {
          throw new Error('Invalid file provided for upload')
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          throw new Error('File too large for upload (max 50MB)')
        }
        
        const { publicUrl } = await blink.storage.upload(file, path, {
          upsert: options.upsert || true
        })
        
        if (!publicUrl || typeof publicUrl !== 'string') {
          throw new Error('Invalid URL returned from upload')
        }
        
        return publicUrl
      },
      'File Upload',
      options.retryOptions,
      { enableFallbacks: false, fallbackProviders: [], fallbackQuality: 'medium' } // No fallbacks for storage
    )
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // Network errors - retryable
    if (message.includes('network') || 
        message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('fetch')) {
      return true
    }
    
    // HTTP status codes - retryable
    if (message.includes('500') || // Internal Server Error
        message.includes('502') || // Bad Gateway
        message.includes('503') || // Service Unavailable
        message.includes('504') || // Gateway Timeout
        message.includes('429')) { // Too Many Requests
      return true
    }
    
    // Specific API errors - retryable
    if (message.includes('rate limit') ||
        message.includes('quota exceeded') ||
        message.includes('service unavailable') ||
        message.includes('temporarily unavailable')) {
      return true
    }
    
    // Non-retryable errors
    if (message.includes('400') || // Bad Request
        message.includes('401') || // Unauthorized
        message.includes('403') || // Forbidden
        message.includes('404') || // Not Found
        message.includes('invalid') ||
        message.includes('malformed') ||
        message.includes('unauthorized')) {
      return false
    }
    
    // Default to retryable for unknown errors
    return true
  }

  /**
   * Execute fallback operations
   */
  private static async executeFallback<T>(
    operationName: string,
    originalError: Error | null,
    options: FallbackOptions
  ): Promise<T> {
    console.log(`Executing fallback for ${operationName}`)
    
    // For speech generation, try simpler text
    if (operationName === 'Speech Generation') {
      return this.fallbackSpeechGeneration() as Promise<T>
    }
    
    // For text generation, try simpler prompt
    if (operationName === 'Text Generation') {
      return this.fallbackTextGeneration() as Promise<T>
    }
    
    throw new Error(`No fallback available for ${operationName}`)
  }

  /**
   * Fallback speech generation with simpler text
   */
  private static async fallbackSpeechGeneration(): Promise<string> {
    try {
      if (!blink) {
        throw new Error('Blink client not available for fallback')
      }
      
      // Use a simple fallback text
      const fallbackText = "Welcome to this presentation. Due to technical limitations, this is a simplified audio version."
      
      const { url } = await blink.ai.generateSpeech({
        text: fallbackText,
        voice: 'alloy', // Use most reliable voice
        model: 'tts-1' // Use standard model instead of HD
      })
      
      console.log('Fallback speech generation succeeded')
      return url
    } catch (error) {
      console.error('Fallback speech generation failed:', error)
      throw new Error('All speech generation methods failed')
    }
  }

  /**
   * Fallback text generation with simpler prompt
   */
  private static async fallbackTextGeneration(): Promise<string> {
    try {
      if (!blink) {
        throw new Error('Blink client not available for fallback')
      }
      
      // Use a simple fallback prompt
      const fallbackPrompt = "Generate a brief professional presentation script about the given topic."
      
      const { text } = await blink.ai.generateText({
        prompt: fallbackPrompt,
        model: 'gpt-3.5-turbo', // Use simpler model
        maxTokens: 500 // Reduce token count
      })
      
      console.log('Fallback text generation succeeded')
      return text
    } catch (error) {
      console.error('Fallback text generation failed:', error)
      throw new Error('All text generation methods failed')
    }
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check API health before making requests
   */
  static async checkAPIHealth(): Promise<{ available: boolean; message: string }> {
    try {
      if (!blink) {
        return { available: false, message: 'Blink client not initialized' }
      }
      
      // Try a simple API call to check health
      await blink.ai.generateText({
        prompt: 'Test',
        model: 'gpt-3.5-turbo',
        maxTokens: 10
      })
      
      return { available: true, message: 'API is healthy' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { available: false, message: `API health check failed: ${message}` }
    }
  }

  /**
   * Get error-specific user-friendly messages
   */
  static getUserFriendlyErrorMessage(error: Error, operationName: string): string {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('connection')) {
      return `Network connection issue during ${operationName}. Please check your internet connection and try again.`
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return `Too many requests. Please wait a moment before trying ${operationName} again.`
    }
    
    if (message.includes('quota') || message.includes('limit')) {
      return `Usage limit reached for ${operationName}. Please try again later or upgrade your plan.`
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return `Authentication failed for ${operationName}. Please refresh the page and try again.`
    }
    
    if (message.includes('service unavailable') || message.includes('503')) {
      return `${operationName} service is temporarily unavailable. Please try again in a few minutes.`
    }
    
    if (message.includes('timeout') || message.includes('504')) {
      return `${operationName} timed out. Please try again with a shorter request.`
    }
    
    // Default message
    return `${operationName} failed. Please try again or contact support if the problem persists.`
  }
}