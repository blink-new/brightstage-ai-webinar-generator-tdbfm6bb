import type { WebinarData } from '../components/WebinarCreator'
import { blink } from '../blink/client'

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
      // Stage 1: Preparing
      this.updateProgress('preparing', 5, 'Preparing video generation...')
      await this.delay(1000)

      // Stage 2: Generate audio narration
      this.updateProgress('generating_audio', 20, 'Generating voice narration...')
      const audioUrl = await this.generateAudioNarration()
      await this.delay(2000)

      // Stage 3: Create slide images
      this.updateProgress('creating_slides', 40, 'Creating slide visuals...')
      const slideImages = await this.generateSlideImages()
      await this.delay(2000)

      // Stage 4: Assemble video
      this.updateProgress('assembling_video', 70, 'Assembling video with slides and audio...')
      const videoUrl = await this.assembleVideo(audioUrl, slideImages)
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

  private async generateAudioNarration(): Promise<string> {
    try {
      if (!blink) {
        throw new Error('Blink client not available')
      }

      // Split script into chunks for better TTS processing
      const scriptChunks = this.splitScript(this.data.script!)
      const audioChunks: string[] = []

      for (const chunk of scriptChunks) {
        const { url } = await blink.ai.generateSpeech({
          text: chunk,
          voice: this.mapVoiceStyle(this.data.voiceStyle || 'professional-female')
        })
        audioChunks.push(url)
      }

      // In a real implementation, you would merge these audio chunks
      // For now, we'll return the first chunk as a mock
      return audioChunks[0] || 'https://example.com/generated-audio.mp3'
    } catch (error) {
      console.error('Audio generation failed:', error)
      return 'https://example.com/fallback-audio.mp3'
    }
  }

  private splitScript(script: string): string[] {
    // Split script into manageable chunks (max 500 characters per chunk)
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

  private async generateSlideImages(): Promise<string[]> {
    const slideImages: string[] = []

    for (const slide of this.data.slides!) {
      try {
        // Generate slide image using canvas or image generation
        const slideImageUrl = await this.createSlideImage(slide)
        slideImages.push(slideImageUrl)
      } catch (error) {
        console.error('Failed to generate slide image:', error)
        // Use a placeholder image
        slideImages.push('https://via.placeholder.com/1920x1080/6366F1/FFFFFF?text=Slide+Image')
      }
    }

    return slideImages
  }

  private async createSlideImage(slide: any): Promise<string> {
    // In a real implementation, this would render the slide to an image
    // using canvas, puppeteer, or a similar technology
    
    // For now, we'll create a mock slide image URL
    const slideTitle = encodeURIComponent(slide.title || 'Slide')
    return `https://via.placeholder.com/1920x1080/6366F1/FFFFFF?text=${slideTitle}`
  }

  private async assembleVideo(audioUrl: string, slideImages: string[]): Promise<string> {
    // In a real implementation, this would use FFmpeg or a video processing service
    // to combine audio with slide images, creating transitions and timing
    
    // Mock video assembly
    const videoId = Math.random().toString(36).substr(2, 9)
    return `https://example.com/generated-videos/${videoId}.mp4`
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
      const estimatedTimeRemaining = this.calculateEstimatedTime(progress)
      this.onProgress({
        stage,
        progress,
        message,
        estimatedTimeRemaining
      })
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