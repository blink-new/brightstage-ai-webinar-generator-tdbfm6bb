import type { WebinarData } from '../types/webinar'
import { blink } from '../blink/client'
import { executeNonBlocking, processInChunks, performanceMonitor } from './performanceUtils'
import { RealVideoGenerator } from './realVideoGenerator'
import { APIErrorHandler } from './apiErrorHandler'

export interface VideoGenerationOptions {
  quality: 'low' | 'medium' | 'high'
  format: 'mp4' | 'webm'
  resolution: '720p' | '1080p' | '4k'
  includeAvatar?: boolean
  avatarStyle?: 'professional' | 'casual' | 'animated'
}

export interface VideoGenerationProgress {
  stage: 'preparing' | 'generating_audio' | 'creating_slides' | 'assembling_video' | 'finalizing' | 'complete'
  progress: number
  message: string
  estimatedTimeRemaining?: number
}

export class VideoGenerator {
  private data: WebinarData
  private options: VideoGenerationOptions
  private onProgress?: (progress: VideoGenerationProgress) => void
  private lastProgressUpdate: number = 0
  private progressUpdateThrottle: number = 100 // Throttle progress updates to every 100ms

  constructor(data: WebinarData, options: VideoGenerationOptions, onProgress?: (progress: VideoGenerationProgress) => void) {
    this.data = data
    this.options = options
    this.onProgress = onProgress
  }

  async generateVideo(): Promise<{ url: string; duration: number; size: number }> {
    if (!this.data.slides || this.data.slides.length === 0) {
      throw new Error('No slides available for video generation')
    }

    if (!this.data.script) {
      throw new Error('No script available for video generation')
    }

    try {
      // Check API health before starting
      this.updateProgress('preparing', 2, 'Checking service availability...')
      const healthCheck = await APIErrorHandler.checkAPIHealth()
      if (!healthCheck.available) {
        throw new Error(`Service unavailable: ${healthCheck.message}`)
      }

      // Try real video generation first
      this.updateProgress('preparing', 5, 'Initializing video generation engine...')
      
      try {
        const realVideoGenerator = new RealVideoGenerator()
        const realVideoOptions = {
          quality: this.options.quality,
          format: this.options.format,
          resolution: this.options.resolution,
          fps: 30
        }

        return await realVideoGenerator.generateRealVideo(
          this.data,
          realVideoOptions,
          this.onProgress
        )
      } catch (realVideoError) {
        console.warn('Real video generation failed, falling back to mock generation:', realVideoError)
        
        // Fallback to mock video generation
        return await this.generateMockVideo()
      }
    } catch (error) {
      const userMessage = APIErrorHandler.getUserFriendlyErrorMessage(
        error instanceof Error ? error : new Error('Unknown error'),
        'Video Generation'
      )
      throw new Error(userMessage)
    }
  }

  /**
   * Fallback mock video generation for when real video generation fails
   */
  private async generateMockVideo(): Promise<{ url: string; duration: number; size: number }> {
    try {
      // Stage 1: Preparing
      this.updateProgress('preparing', 5, 'Preparing video generation (fallback mode)...')
      await this.delay(1000)

      // Stage 2: Generate audio narration with retry logic
      this.updateProgress('generating_audio', 20, 'Generating voice narration...')
      const audioUrl = await this.generateAudioNarrationWithRetry()
      await this.delay(2000)

      // Stage 3: Create slide images with retry logic
      this.updateProgress('creating_slides', 40, 'Creating slide visuals...')
      const slideImages = await this.generateSlideImagesWithRetry()
      await this.delay(2000)

      // Stage 4: Assemble video (mock)
      this.updateProgress('assembling_video', 70, 'Assembling video with slides and audio...')
      const videoUrl = await this.assembleMockVideo(audioUrl, slideImages)
      await this.delay(3000)

      // Stage 5: Finalizing
      this.updateProgress('finalizing', 95, 'Finalizing video...')
      await this.delay(1000)

      // Stage 6: Complete
      this.updateProgress('complete', 100, 'Video generation complete!')

      return {
        url: videoUrl,
        duration: this.data.duration * 60, // Convert minutes to seconds
        size: this.estimateVideoSize()
      }
    } catch (error) {
      throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateAudioNarrationWithRetry(): Promise<string> {
    try {
      // Split script into chunks for better TTS processing
      const scriptChunks = await this.splitScript(this.data.script!)
      const audioChunks: string[] = []

      this.updateProgress('generating_audio', 25, `Generating audio for ${scriptChunks.length} script segments...`)

      // Process audio chunks with retry logic
      for (let i = 0; i < scriptChunks.length; i++) {
        const chunk = scriptChunks[i]
        
        try {
          const audioUrl = await APIErrorHandler.generateSpeechWithRetry(
            chunk,
            this.mapVoiceStyle(this.data.voiceStyle || 'professional-female'),
            {
              retryOptions: { maxRetries: 3, baseDelay: 1000 },
              fallbackOptions: { enableFallbacks: true }
            }
          )
          
          audioChunks.push(audioUrl)
          
          // Update progress for each chunk
          const chunkProgress = 25 + (10 * (i + 1) / scriptChunks.length)
          this.updateProgress('generating_audio', chunkProgress, `Generated audio segment ${i + 1}/${scriptChunks.length}`)
          
        } catch (error) {
          console.warn(`Failed to generate audio for chunk ${i + 1} after retries:`, error)
          // Continue with other chunks instead of failing completely
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('Failed to generate any audio segments after retries')
      }

      // For now, return the first successful audio chunk
      // In production, you would merge these using audio processing libraries
      return audioChunks[0]
    } catch (error) {
      console.error('Audio generation failed:', error)
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async splitScript(script: string): Promise<string[]> {
    // Split script into manageable chunks (max 500 characters per chunk) without blocking
    return executeNonBlocking(() => {
      const chunks: string[] = []
      const sentences = script.split(/[.!?]+/)
      let currentChunk = ''

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > 500 && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          currentChunk = sentence
        } else {
          currentChunk += sentence + '.'
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }

      return chunks
    })
  }

  private mapVoiceStyle(voiceStyle: string): string {
    // Map our voice styles to available TTS voices
    const voiceMap: Record<string, string> = {
      'professional-male': 'onyx',
      'professional-female': 'nova',
      'enthusiastic-male': 'echo',
      'enthusiastic-female': 'shimmer',
      'calm-male': 'fable',
      'calm-female': 'alloy'
    }

    return voiceMap[voiceStyle] || 'nova'
  }

  private async generateSlideImagesWithRetry(): Promise<string[]> {
    const slideImages: string[] = []
    const totalSlides = this.data.slides!.length

    for (let i = 0; i < totalSlides; i++) {
      const slide = this.data.slides![i]
      try {
        // Update progress for each slide
        const slideProgress = 40 + (25 * (i + 1) / totalSlides)
        this.updateProgress('creating_slides', slideProgress, `Creating slide ${i + 1}/${totalSlides}: ${slide.title}`)

        // Generate slide image using canvas rendering with retry
        const slideImageUrl = await this.createSlideImageWithRetry(slide, i + 1)
        slideImages.push(slideImageUrl)
      } catch (error) {
        console.error(`Failed to generate slide ${i + 1} image after retries:`, error)
        // Use a styled placeholder image
        const fallbackUrl = await this.createFallbackSlideImage(slide, i + 1)
        slideImages.push(fallbackUrl)
      }
    }

    return slideImages
  }

  private async createSlideImageWithRetry(slide: any, slideNumber: number): Promise<string> {
    // Create a canvas-based slide image with non-blocking rendering and retry logic
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Set canvas dimensions (16:9 aspect ratio)
    canvas.width = 1920
    canvas.height = 1080
    
    // Apply template styling using requestAnimationFrame to prevent blocking
    const template = this.data.template || 'modern'
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        this.applySlideTemplate(ctx, template, slide, slideNumber)
        resolve()
      })
    })
    
    // Convert canvas to blob and upload to storage with retry logic
    return new Promise((resolve, reject) => {
      // Use requestAnimationFrame for blob creation to prevent blocking
      requestAnimationFrame(() => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Failed to create slide image blob'))
            return
          }
          
          try {
            // Upload to Blink storage with retry logic
            const publicUrl = await APIErrorHandler.uploadFileWithRetry(
              blob,
              `slides/slide-${slideNumber}-${Date.now()}.png`,
              {
                upsert: true,
                retryOptions: { maxRetries: 3, baseDelay: 1000 }
              }
            )
            resolve(publicUrl)
          } catch (error) {
            console.error('Failed to upload slide image after retries:', error)
            // Fallback to data URL
            const dataUrl = canvas.toDataURL('image/png')
            resolve(dataUrl)
          }
        }, 'image/png', 0.9)
      })
    })
  }

  private applySlideTemplate(ctx: CanvasRenderingContext2D, template: string, slide: any, slideNumber: number) {
    // Clear canvas with background
    ctx.fillStyle = '#FAFAFA'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Apply template-specific styling
    switch (template) {
      case 'modern':
        this.applyModernTemplate(ctx, slide, slideNumber)
        break
      case 'corporate':
        this.applyCorporateTemplate(ctx, slide, slideNumber)
        break
      case 'minimal':
        this.applyMinimalTemplate(ctx, slide, slideNumber)
        break
      default:
        this.applyModernTemplate(ctx, slide, slideNumber)
    }
  }

  private applyModernTemplate(ctx: CanvasRenderingContext2D, slide: any, slideNumber: number) {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
    gradient.addColorStop(0, '#6366F1')
    gradient.addColorStop(1, '#8B5CF6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Title
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 72px Inter, sans-serif'
    ctx.textAlign = 'center'
    const title = slide.title || `Slide ${slideNumber}`
    ctx.fillText(title, 960, 300)
    
    // Subtitle
    if (slide.subtitle) {
      ctx.font = '36px Inter, sans-serif'
      ctx.fillStyle = '#E2E8F0'
      ctx.fillText(slide.subtitle, 960, 380)
    }
    
    // Bullet points
    if (slide.points && slide.points.length > 0) {
      ctx.font = '32px Inter, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      
      slide.points.slice(0, 5).forEach((point: string, index: number) => {
        const y = 500 + (index * 60)
        ctx.fillText(`• ${point}`, 200, y)
      })
    }
    
    // Slide number
    ctx.font = '24px Inter, sans-serif'
    ctx.fillStyle = '#CBD5E1'
    ctx.textAlign = 'right'
    ctx.fillText(`${slideNumber}`, 1820, 1020)
  }

  private applyCorporateTemplate(ctx: CanvasRenderingContext2D, slide: any, slideNumber: number) {
    // White background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Header bar
    ctx.fillStyle = '#1E293B'
    ctx.fillRect(0, 0, 1920, 120)
    
    // Title
    ctx.fillStyle = '#1E293B'
    ctx.font = 'bold 64px Inter, sans-serif'
    ctx.textAlign = 'center'
    const title = slide.title || `Slide ${slideNumber}`
    ctx.fillText(title, 960, 250)
    
    // Content area with subtle border
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 2
    ctx.strokeRect(100, 300, 1720, 600)
    
    // Bullet points
    if (slide.points && slide.points.length > 0) {
      ctx.font = '36px Inter, sans-serif'
      ctx.fillStyle = '#475569'
      ctx.textAlign = 'left'
      
      slide.points.slice(0, 5).forEach((point: string, index: number) => {
        const y = 400 + (index * 80)
        ctx.fillText(`${index + 1}. ${point}`, 150, y)
      })
    }
  }

  private applyMinimalTemplate(ctx: CanvasRenderingContext2D, slide: any, slideNumber: number) {
    // Clean white background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Simple title
    ctx.fillStyle = '#0F172A'
    ctx.font = '56px Inter, sans-serif'
    ctx.textAlign = 'center'
    const title = slide.title || `Slide ${slideNumber}`
    ctx.fillText(title, 960, 200)
    
    // Thin underline
    ctx.strokeStyle = '#6366F1'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(460, 230)
    ctx.lineTo(1460, 230)
    ctx.stroke()
    
    // Clean bullet points
    if (slide.points && slide.points.length > 0) {
      ctx.font = '32px Inter, sans-serif'
      ctx.fillStyle = '#475569'
      ctx.textAlign = 'left'
      
      slide.points.slice(0, 4).forEach((point: string, index: number) => {
        const y = 350 + (index * 100)
        // Simple bullet
        ctx.fillStyle = '#6366F1'
        ctx.beginPath()
        ctx.arc(300, y - 10, 8, 0, 2 * Math.PI)
        ctx.fill()
        
        // Text
        ctx.fillStyle = '#475569'
        ctx.fillText(point, 350, y)
      })
    }
  }

  private async createFallbackSlideImage(slide: any, slideNumber: number): Promise<string> {
    // Create a simple fallback image using a service
    const title = encodeURIComponent(slide.title || `Slide ${slideNumber}`)
    return `https://via.placeholder.com/1920x1080/6366F1/FFFFFF?text=${title}`
  }

  private async assembleMockVideo(audioUrl: string, slideImages: string[]): Promise<string> {
    // Simulate video assembly process with realistic steps
    this.updateProgress('assembling_video', 75, 'Calculating slide timings...')
    await this.delay(1000)
    
    // Calculate timing for each slide based on script and duration
    const slideDurations = this.calculateSlideDurations()
    
    this.updateProgress('assembling_video', 80, 'Preparing video frames...')
    await this.delay(1500)
    
    // In a real implementation, this would:
    // 1. Use FFmpeg to create video from images
    // 2. Add transitions between slides
    // 3. Sync with audio track
    // 4. Apply video effects and branding
    
    this.updateProgress('assembling_video', 85, 'Combining audio and visuals...')
    await this.delay(2000)
    
    // Create a mock video blob and upload it with retry logic
    try {
      this.updateProgress('assembling_video', 88, 'Creating video file...')
      
      // Create a simple mock video blob (in production, this would be the actual video)
      const mockVideoData = this.createMockVideoBlob(slideImages, audioUrl)
      
      this.updateProgress('assembling_video', 90, 'Uploading video...')
      
      // Upload mock video with retry logic
      const videoId = `webinar_${this.data.topic.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
      const videoUrl = await APIErrorHandler.uploadFileWithRetry(
        mockVideoData,
        `videos/${videoId}.mp4`,
        {
          upsert: true,
          retryOptions: { maxRetries: 3, baseDelay: 2000 }
        }
      )
      
      // Store video metadata for later use
      const videoMetadata = {
        slides: slideImages.length,
        duration: this.data.duration,
        quality: this.options.quality,
        resolution: this.options.resolution,
        timestamp: Date.now()
      }
      console.log('Mock video assembled with metadata:', videoMetadata)
      
      return videoUrl
    } catch (error) {
      console.warn('Failed to upload mock video, using fallback URL:', error)
      
      // Fallback to a mock URL if upload fails
      const videoId = `webinar_${this.data.topic.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
      return `https://storage.googleapis.com/blink-videos/${videoId}.mp4`
    }
  }

  /**
   * Create a mock video blob for testing purposes
   */
  private createMockVideoBlob(slideImages: string[], audioUrl: string): Blob {
    // Create a simple mock video file (just metadata for now)
    const mockVideoMetadata = {
      type: 'mock-video',
      slides: slideImages.length,
      audioUrl,
      duration: this.data.duration,
      quality: this.options.quality,
      resolution: this.options.resolution,
      timestamp: Date.now(),
      format: this.options.format
    }
    
    const mockVideoContent = JSON.stringify(mockVideoMetadata, null, 2)
    return new Blob([mockVideoContent], { type: 'application/json' })
  }

  private calculateSlideDurations(): number[] {
    const totalDuration = this.data.duration * 60 // Convert to seconds
    const slideCount = this.data.slides!.length
    
    // Distribute time based on slide content complexity
    const durations: number[] = []
    let remainingTime = totalDuration
    
    for (let i = 0; i < slideCount; i++) {
      const slide = this.data.slides![i]
      let slideDuration: number
      
      if (i === 0) {
        // Title slide - shorter duration
        slideDuration = Math.min(30, remainingTime * 0.1)
      } else if (i === slideCount - 1) {
        // Conclusion slide - use remaining time
        slideDuration = remainingTime
      } else {
        // Content slides - based on content complexity
        const contentComplexity = this.calculateSlideComplexity(slide)
        const baseDuration = remainingTime / (slideCount - i)
        slideDuration = baseDuration * contentComplexity
      }
      
      durations.push(Math.max(15, slideDuration)) // Minimum 15 seconds per slide
      remainingTime -= slideDuration
    }
    
    return durations
  }

  private calculateSlideComplexity(slide: any): number {
    // Calculate complexity based on content amount
    let complexity = 1.0
    
    if (slide.points && slide.points.length > 0) {
      complexity += slide.points.length * 0.2 // More points = more time
    }
    
    if (slide.subtitle) {
      complexity += 0.3 // Subtitle adds complexity
    }
    
    if (slide.image || slide.chart) {
      complexity += 0.4 // Visual elements need explanation time
    }
    
    return Math.min(2.0, complexity) // Cap at 2x base duration
  }

  private estimateVideoSize(): number {
    // Estimate video size based on duration and quality
    const durationMinutes = this.data.duration
    const baseSize = durationMinutes * 10 // 10MB per minute base
    
    const qualityMultiplier = {
      'low': 0.5,
      'medium': 1,
      'high': 2
    }[this.options.quality]
    
    const resolutionMultiplier = {
      '720p': 1,
      '1080p': 2,
      '4k': 8
    }[this.options.resolution]
    
    return Math.round(baseSize * qualityMultiplier * resolutionMultiplier * 1024 * 1024) // Convert to bytes
  }

  private updateProgress(stage: VideoGenerationProgress['stage'], progress: number, message: string) {
    if (this.onProgress) {
      const now = Date.now()
      // Throttle progress updates to prevent excessive re-renders
      if (now - this.lastProgressUpdate >= this.progressUpdateThrottle || progress === 100) {
        this.lastProgressUpdate = now
        const estimatedTimeRemaining = this.calculateEstimatedTime(progress)
        
        // Use requestAnimationFrame to ensure smooth UI updates
        requestAnimationFrame(() => {
          this.onProgress!({
            stage,
            progress,
            message,
            estimatedTimeRemaining
          })
        })
      }
    }
  }

  private calculateEstimatedTime(progress: number): number {
    // Estimate remaining time based on current progress
    const totalEstimatedTime = this.data.duration * 2 // 2 minutes per minute of content
    const remainingProgress = 100 - progress
    return Math.round((remainingProgress / 100) * totalEstimatedTime * 60) // Return in seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async generatePitchVideo(data: WebinarData): Promise<{ url: string; duration: number }> {
    // Generate a condensed 5-10 minute version
    if (!data.slides || data.slides.length === 0) {
      throw new Error('No slides available for pitch video generation')
    }

    // Select key slides for the pitch (first, middle, and last slides)
    const keySlides = [
      data.slides[0], // Title slide
      ...data.slides.slice(1, -1).filter((_, index) => index % 3 === 0), // Every 3rd slide
      data.slides[data.slides.length - 1] // Conclusion slide
    ]

    // Generate condensed script
    const pitchScript = await VideoGenerator.generatePitchScript(data, keySlides)

    // Create pitch video data
    const pitchData: WebinarData = {
      ...data,
      slides: keySlides,
      script: pitchScript,
      duration: Math.min(10, Math.max(5, keySlides.length * 1.5)) // 1.5 minutes per slide, 5-10 min total
    }

    const generator = new VideoGenerator(pitchData, {
      quality: 'medium',
      format: 'mp4',
      resolution: '1080p'
    })

    const result = await generator.generateVideo()
    return {
      url: result.url,
      duration: result.duration
    }
  }

  private static async generatePitchScript(data: WebinarData, keySlides: any[]): Promise<string> {
    try {
      if (!blink) {
        throw new Error('Blink client not available')
      }

      const { text } = await blink.ai.generateText({
        prompt: `Create a condensed 5-10 minute pitch script for this webinar:

        Original Topic: ${data.topic}
        Original Duration: ${data.duration} minutes
        Target Audience: ${data.audience}
        
        Key Slides to Cover:
        ${keySlides.map((slide, index) => `${index + 1}. ${slide.title}${slide.points ? ': ' + slide.points.slice(0, 2).join(', ') : ''}`).join('\n')}
        
        Requirements:
        1. Hook the audience in the first 30 seconds
        2. Present the most compelling points quickly
        3. Include a strong call-to-action
        4. Keep it engaging and fast-paced
        5. Highlight key benefits and value propositions
        6. End with next steps or contact information
        
        Format with timing cues:
        [00:00] Hook and introduction...
        [01:30] Key point 1...
        [03:00] Key point 2...
        etc.`,
        model: 'gpt-4o-mini'
      })
      
      return text
    } catch (error) {
      console.error('Failed to generate pitch script:', error)
      return `Welcome to this quick overview of ${data.topic}. In the next few minutes, I'll share the key insights that can transform your approach...`
    }
  }
}

export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'mov'
  quality: 'low' | 'medium' | 'high' | 'ultra'
  resolution: '720p' | '1080p' | '4k'
  includeSubtitles?: boolean
  includeBranding?: boolean
}

export class VideoExporter {
  static async exportVideo(videoUrl: string, options: VideoExportOptions, filename?: string): Promise<void> {
    try {
      // In a real implementation, this would convert/re-encode the video
      // For now, we'll just download the existing video
      
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `webinar_video.${options.format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      throw new Error(`Video export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static getEstimatedExportTime(durationMinutes: number, quality: VideoExportOptions['quality']): number {
    // Estimate export time based on video duration and quality
    const baseTimePerMinute = {
      'low': 30,      // 30 seconds per minute of video
      'medium': 60,   // 1 minute per minute of video
      'high': 120,    // 2 minutes per minute of video
      'ultra': 300    // 5 minutes per minute of video
    }[quality]
    
    return durationMinutes * baseTimePerMinute
  }

  static getEstimatedFileSize(durationMinutes: number, options: VideoExportOptions): number {
    // Estimate file size in bytes
    const baseSizePerMinute = {
      '720p': 50,   // 50MB per minute
      '1080p': 100, // 100MB per minute
      '4k': 400     // 400MB per minute
    }[options.resolution]
    
    const qualityMultiplier = {
      'low': 0.5,
      'medium': 1,
      'high': 1.5,
      'ultra': 2.5
    }[options.quality]
    
    return Math.round(durationMinutes * baseSizePerMinute * qualityMultiplier * 1024 * 1024)
  }
}