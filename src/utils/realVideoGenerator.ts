import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { blink } from '../blink/client'
import { validateBlobContent, validateUrl, sanitizeTextContent, logSecurityEvent } from './securityUtils'

export interface RealVideoGenerationOptions {
  quality: 'low' | 'medium' | 'high'
  format: 'mp4' | 'webm'
  resolution: '720p' | '1080p' | '4k'
  fps: number
}

export interface VideoGenerationProgress {
  stage: 'preparing' | 'generating_audio' | 'creating_slides' | 'assembling_video' | 'finalizing' | 'complete'
  progress: number
  message: string
  estimatedTimeRemaining?: number
}

export class RealVideoGenerator {
  private ffmpeg: FFmpeg | null = null
  private isLoaded = false

  constructor() {
    this.ffmpeg = new FFmpeg()
  }

  async initialize(): Promise<void> {
    if (this.isLoaded || !this.ffmpeg) return

    try {
      // Load FFmpeg with proper CORS handling
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      this.isLoaded = true
      console.log('FFmpeg loaded successfully')
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw new Error('Video processing engine failed to initialize')
    }
  }

  async generateRealVideo(
    data: any,
    options: RealVideoGenerationOptions,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<{ url: string; duration: number; size: number }> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized')
    }

    try {
      // Initialize FFmpeg if not already loaded
      await this.initialize()

      // Stage 1: Generate audio narration
      onProgress?.({
        stage: 'generating_audio',
        progress: 10,
        message: 'Generating voice narration...'
      })

      const audioUrl = await this.generateAudioNarration(data)
      
      // Stage 2: Create slide images
      onProgress?.({
        stage: 'creating_slides',
        progress: 30,
        message: 'Creating slide visuals...'
      })

      const slideImages = await this.generateSlideImages(data)

      // Stage 3: Assemble video with FFmpeg
      onProgress?.({
        stage: 'assembling_video',
        progress: 60,
        message: 'Assembling video with slides and audio...'
      })

      const videoBlob = await this.assembleVideoWithFFmpeg(
        slideImages,
        audioUrl,
        data,
        options,
        onProgress
      )

      // Stage 4: Upload to storage
      onProgress?.({
        stage: 'finalizing',
        progress: 90,
        message: 'Uploading video...'
      })

      const { publicUrl } = await blink.storage.upload(
        videoBlob,
        `videos/webinar_${Date.now()}.${options.format}`,
        { upsert: true }
      )

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Video generation complete!'
      })

      return {
        url: publicUrl,
        duration: data.duration * 60,
        size: videoBlob.size
      }
    } catch (error) {
      console.error('Real video generation failed:', error)
      throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateAudioNarration(data: any): Promise<string> {
    try {
      // Sanitize script content for security
      const sanitizedScript = sanitizeTextContent(data.script || '')
      
      // Split script into manageable chunks
      const scriptChunks = this.splitScript(sanitizedScript, 500)
      const audioChunks: string[] = []

      // Generate audio for each chunk with retry logic
      for (let i = 0; i < scriptChunks.length; i++) {
        const chunk = scriptChunks[i]
        let retries = 3
        
        while (retries > 0) {
          try {
            const { url } = await blink.ai.generateSpeech({
              text: chunk,
              voice: this.mapVoiceStyle(data.voiceStyle || 'professional-female')
            })
            
            // Validate the returned audio URL
            const urlValidation = validateUrl(url)
            if (!urlValidation.isValid) {
              logSecurityEvent('invalid_url', {
                url,
                context: 'audio_generation',
                error: urlValidation.error
              })
              throw new Error(`Invalid audio URL: ${urlValidation.error}`)
            }
            
            audioChunks.push(url)
            break
          } catch (error) {
            retries--
            if (retries === 0) {
              console.warn(`Failed to generate audio for chunk ${i + 1} after 3 retries`)
              logSecurityEvent('suspicious_upload', {
                context: 'audio_generation_failed',
                chunk: i + 1,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
              // Use text-to-speech fallback or skip this chunk
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
            }
          }
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('Failed to generate any audio segments')
      }

      // For now, return the first successful audio chunk
      // In production, you would merge these using FFmpeg
      return audioChunks[0]
    } catch (error) {
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateSlideImages(data: any): Promise<string[]> {
    const slideImages: string[] = []
    
    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i]
      try {
        const slideImageUrl = await this.createSlideImage(slide, i + 1, data.template)
        slideImages.push(slideImageUrl)
      } catch (error) {
        console.error(`Failed to generate slide ${i + 1}:`, error)
        // Create fallback slide
        const fallbackUrl = await this.createFallbackSlideImage(slide, i + 1)
        slideImages.push(fallbackUrl)
      }
    }

    return slideImages
  }

  private async assembleVideoWithFFmpeg(
    slideImages: string[],
    audioUrl: string,
    data: any,
    options: RealVideoGenerationOptions,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized')
    }

    try {
      // Calculate slide durations
      const totalDuration = data.duration * 60 // Convert to seconds
      const slideDuration = totalDuration / slideImages.length

      // Download and prepare slide images
      onProgress?.({
        stage: 'assembling_video',
        progress: 65,
        message: 'Preparing slide images...'
      })

      for (let i = 0; i < slideImages.length; i++) {
        const imageData = await fetchFile(slideImages[i])
        await this.ffmpeg.writeFile(`slide_${i}.png`, imageData)
      }

      // Download and prepare audio
      onProgress?.({
        stage: 'assembling_video',
        progress: 70,
        message: 'Preparing audio track...'
      })

      const audioData = await fetchFile(audioUrl)
      await this.ffmpeg.writeFile('audio.mp3', audioData)

      // Create video from slides
      onProgress?.({
        stage: 'assembling_video',
        progress: 75,
        message: 'Creating video from slides...'
      })

      // Get resolution settings
      const { width, height } = this.getResolutionSettings(options.resolution)

      // Create a concat file for FFmpeg
      let concatContent = ''
      for (let i = 0; i < slideImages.length; i++) {
        concatContent += `file 'slide_${i}.png'\n`
        concatContent += `duration ${slideDuration}\n`
      }
      // Add the last slide again for proper duration
      if (slideImages.length > 0) {
        concatContent += `file 'slide_${slideImages.length - 1}.png'\n`
      }

      await this.ffmpeg.writeFile('slides.txt', concatContent)

      // Generate video with slides
      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'slides.txt',
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        '-r', options.fps.toString(),
        '-pix_fmt', 'yuv420p',
        'slides_video.mp4'
      ])

      // Combine video with audio
      onProgress?.({
        stage: 'assembling_video',
        progress: 85,
        message: 'Combining video with audio...'
      })

      const outputFormat = options.format === 'webm' ? 'webm' : 'mp4'
      const codec = options.format === 'webm' ? 'libvpx-vp9' : 'libx264'

      await this.ffmpeg.exec([
        '-i', 'slides_video.mp4',
        '-i', 'audio.mp3',
        '-c:v', codec,
        '-c:a', options.format === 'webm' ? 'libvorbis' : 'aac',
        '-shortest', // End when shortest stream ends
        '-preset', this.getQualityPreset(options.quality),
        `output.${outputFormat}`
      ])

      // Read the output file
      const outputData = await this.ffmpeg.readFile(`output.${outputFormat}`)
      
      // Create blob
      const mimeType = options.format === 'webm' ? 'video/webm' : 'video/mp4'
      const videoBlob = new Blob([outputData], { type: mimeType })

      // Validate the generated video blob for security
      const blobValidation = validateBlobContent(videoBlob, mimeType)
      if (!blobValidation.isValid) {
        logSecurityEvent('file_validation_failed', {
          context: 'video_generation',
          error: blobValidation.error,
          expectedType: mimeType,
          actualType: videoBlob.type,
          size: videoBlob.size
        })
        throw new Error(`Generated video failed security validation: ${blobValidation.error}`)
      }

      // Cleanup FFmpeg files
      await this.cleanup()

      return videoBlob
    } catch (error) {
      await this.cleanup()
      throw new Error(`Video assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async createSlideImage(slide: any, slideNumber: number, template: string): Promise<string> {
    // Create canvas-based slide image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Set canvas dimensions (16:9 aspect ratio)
    canvas.width = 1920
    canvas.height = 1080
    
    // Apply template styling
    this.applySlideTemplate(ctx, template, slide, slideNumber)
    
    // Convert to blob and upload
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to create slide image blob'))
          return
        }
        
        try {
          const { publicUrl } = await blink.storage.upload(
            blob,
            `slides/slide-${slideNumber}-${Date.now()}.png`,
            { upsert: true }
          )
          resolve(publicUrl)
        } catch (error) {
          // Fallback to data URL
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl)
        }
      }, 'image/png', 0.9)
    })
  }

  private applySlideTemplate(ctx: CanvasRenderingContext2D, template: string, slide: any, slideNumber: number) {
    // Clear canvas with background
    ctx.fillStyle = '#FAFAFA'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Apply modern template styling
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
    gradient.addColorStop(0, '#6366F1')
    gradient.addColorStop(1, '#8B5CF6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Title
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 72px Arial, sans-serif'
    ctx.textAlign = 'center'
    const title = slide.title || `Slide ${slideNumber}`
    ctx.fillText(title, 960, 300)
    
    // Content
    if (slide.content && slide.content.length > 0) {
      ctx.font = '32px Arial, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      
      slide.content.slice(0, 5).forEach((point: string, index: number) => {
        const y = 500 + (index * 60)
        ctx.fillText(`• ${point}`, 200, y)
      })
    }
    
    // Slide number
    ctx.font = '24px Arial, sans-serif'
    ctx.fillStyle = '#CBD5E1'
    ctx.textAlign = 'right'
    ctx.fillText(`${slideNumber}`, 1820, 1020)
  }

  private async createFallbackSlideImage(slide: any, slideNumber: number): Promise<string> {
    const title = encodeURIComponent(slide.title || `Slide ${slideNumber}`)
    return `https://via.placeholder.com/1920x1080/6366F1/FFFFFF?text=${title}`
  }

  private splitScript(script: string, maxChunkSize: number): string[] {
    const chunks: string[] = []
    const sentences = script.split(/[.!?]+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
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

  private getResolutionSettings(resolution: string): { width: number; height: number } {
    switch (resolution) {
      case '720p':
        return { width: 1280, height: 720 }
      case '1080p':
        return { width: 1920, height: 1080 }
      case '4k':
        return { width: 3840, height: 2160 }
      default:
        return { width: 1920, height: 1080 }
    }
  }

  private getQualityPreset(quality: string): string {
    switch (quality) {
      case 'low':
        return 'ultrafast'
      case 'medium':
        return 'medium'
      case 'high':
        return 'slow'
      default:
        return 'medium'
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.ffmpeg) return

    try {
      // List and remove all files
      const files = await this.ffmpeg.listDir('/')
      for (const file of files) {
        if (file.isFile) {
          await this.ffmpeg.deleteFile(file.name)
        }
      }
    } catch (error) {
      console.warn('Cleanup warning:', error)
    }
  }
}