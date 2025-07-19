import type { WebinarData } from '../types/webinar'
import type { VideoGenerationProgress } from './videoGenerator'
import { blink } from '../blink/client'
import { performanceMonitor } from './performanceUtils'

export interface RealVideoOptions {
  quality: 'low' | 'medium' | 'high'
  format: 'mp4' | 'webm'
  resolution: '720p' | '1080p' | '4k'
  fps: number
}

export class RealVideoGenerator {
  private ffmpegLoaded = false
  private ffmpeg: any = null

  constructor() {
    // Initialize FFmpeg if available
    this.initializeFFmpeg()
  }

  private async initializeFFmpeg() {
    try {
      // Try to load FFmpeg for client-side video processing
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { fetchFile } = await import('@ffmpeg/util')
      
      this.ffmpeg = new FFmpeg()
      
      // Load FFmpeg with error handling
      await this.ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
      })
      
      this.ffmpegLoaded = true
      console.log('FFmpeg loaded successfully for real video generation')
    } catch (error) {
      console.warn('FFmpeg not available, falling back to mock video generation:', error)
      this.ffmpegLoaded = false
    }
  }

  async generateRealVideo(
    data: WebinarData,
    options: RealVideoOptions,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<{ url: string; duration: number; size: number }> {
    if (!this.ffmpegLoaded) {
      throw new Error('FFmpeg not available for real video generation')
    }

    return performanceMonitor.monitorAsync('Real Video Generation', async () => {
      try {
        // Stage 1: Prepare assets
        this.updateProgress(onProgress, 'preparing', 5, 'Preparing video assets...')
        const assets = await this.prepareVideoAssets(data)

        // Stage 2: Generate audio
        this.updateProgress(onProgress, 'generating_audio', 20, 'Generating audio narration...')
        const audioFile = await this.generateAudioTrack(data.script!, data.voiceStyle || 'professional-female')

        // Stage 3: Create slide images
        this.updateProgress(onProgress, 'creating_slides', 40, 'Creating slide visuals...')
        const slideImages = await this.generateSlideImages(data.slides!, data.template || 'modern-business')

        // Stage 4: Assemble video
        this.updateProgress(onProgress, 'assembling_video', 70, 'Assembling video with FFmpeg...')
        const videoBlob = await this.assembleVideoWithFFmpeg(slideImages, audioFile, options)

        // Stage 5: Upload final video
        this.updateProgress(onProgress, 'finalizing', 90, 'Uploading final video...')
        const videoUrl = await this.uploadVideo(videoBlob, data.topic)

        this.updateProgress(onProgress, 'complete', 100, 'Video generation complete!')

        return {
          url: videoUrl,
          duration: data.duration * 60,
          size: videoBlob.size
        }
      } catch (error) {
        console.error('Real video generation failed:', error)
        throw new Error(`Real video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }

  private async prepareVideoAssets(data: WebinarData): Promise<any> {
    // Validate required data
    if (!data.slides || data.slides.length === 0) {
      throw new Error('No slides available for video generation')
    }

    if (!data.script) {
      throw new Error('No script available for video generation')
    }

    // Calculate timing for each slide
    const totalDuration = data.duration * 60 // Convert to seconds
    const slideDurations = this.calculateSlideDurations(data.slides, totalDuration)

    return {
      slides: data.slides,
      script: data.script,
      slideDurations,
      totalDuration
    }
  }

  private calculateSlideDurations(slides: any[], totalDuration: number): number[] {
    const durations: number[] = []
    let remainingTime = totalDuration
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      let slideDuration: number
      
      if (i === 0) {
        // Title slide - shorter duration
        slideDuration = Math.min(30, remainingTime * 0.1)
      } else if (i === slides.length - 1) {
        // Last slide - use remaining time
        slideDuration = Math.max(15, remainingTime)
      } else {
        // Content slides - distribute evenly with content-based adjustments
        const baseDuration = remainingTime / (slides.length - i)
        const contentComplexity = this.calculateSlideComplexity(slide)
        slideDuration = baseDuration * contentComplexity
      }
      
      slideDuration = Math.max(10, Math.min(120, slideDuration)) // Between 10s and 2min
      durations.push(slideDuration)
      remainingTime -= slideDuration
    }
    
    return durations
  }

  private calculateSlideComplexity(slide: any): number {
    let complexity = 1.0
    
    if (slide.points && slide.points.length > 0) {
      complexity += slide.points.length * 0.15
    }
    
    if (slide.image || slide.chart || slide.statistics) {
      complexity += 0.3
    }
    
    if (slide.quote) {
      complexity += 0.2
    }
    
    return Math.min(1.8, complexity)
  }

  private async generateAudioTrack(script: string, voiceStyle: string): Promise<Uint8Array> {
    try {
      if (!blink?.ai) {
        throw new Error('AI service not available for audio generation')
      }

      // Map voice style to available voices
      const voiceMap: Record<string, string> = {
        'professional-male': 'onyx',
        'professional-female': 'nova',
        'enthusiastic-male': 'echo',
        'enthusiastic-female': 'shimmer',
        'calm-male': 'fable',
        'calm-female': 'alloy'
      }

      const voice = voiceMap[voiceStyle] || 'nova'

      // Generate speech
      const { url } = await blink.ai.generateSpeech({
        text: script,
        voice
      })

      // Fetch audio data
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (error) {
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateSlideImages(slides: any[], template: string): Promise<Uint8Array[]> {
    const images: Uint8Array[] = []
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      
      try {
        const imageData = await this.createSlideImage(slide, template, i + 1)
        images.push(imageData)
      } catch (error) {
        console.error(`Failed to create slide ${i + 1} image:`, error)
        // Create a fallback image
        const fallbackImage = await this.createFallbackSlideImage(slide, i + 1)
        images.push(fallbackImage)
      }
    }
    
    return images
  }

  private async createSlideImage(slide: any, template: string, slideNumber: number): Promise<Uint8Array> {
    // Create canvas for slide
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Set canvas size (1920x1080 for Full HD)
    canvas.width = 1920
    canvas.height = 1080
    
    // Apply template styling
    this.applySlideTemplate(ctx, template, slide, slideNumber)
    
    // Convert canvas to image data
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to create slide image blob'))
          return
        }
        
        const arrayBuffer = await blob.arrayBuffer()
        resolve(new Uint8Array(arrayBuffer))
      }, 'image/png')
    })
  }

  private applySlideTemplate(ctx: CanvasRenderingContext2D, template: string, slide: any, slideNumber: number) {
    // Clear canvas
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Apply template-specific styling
    switch (template) {
      case 'modern-business':
        this.applyModernBusinessTemplate(ctx, slide, slideNumber)
        break
      case 'tech-gradient':
        this.applyTechGradientTemplate(ctx, slide, slideNumber)
        break
      case 'creative-bold':
        this.applyCreativeBoldTemplate(ctx, slide, slideNumber)
        break
      default:
        this.applyModernBusinessTemplate(ctx, slide, slideNumber)
    }
  }

  private applyModernBusinessTemplate(ctx: CanvasRenderingContext2D, slide: any, slideNumber: number) {
    // Background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Header bar
    ctx.fillStyle = '#1E40AF'
    ctx.fillRect(0, 0, 1920, 100)
    
    // Title
    ctx.fillStyle = '#1E40AF'
    ctx.font = 'bold 64px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(slide.title || `Slide ${slideNumber}`, 960, 250)
    
    // Content
    if (slide.points && slide.points.length > 0) {
      ctx.fillStyle = '#333333'
      ctx.font = '36px Arial'
      ctx.textAlign = 'left'
      
      slide.points.slice(0, 5).forEach((point: string, index: number) => {
        const y = 350 + (index * 80)
        ctx.fillText(`• ${point}`, 150, y)
      })
    }
    
    // Slide number
    ctx.fillStyle = '#666666'
    ctx.font = '24px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(slideNumber.toString(), 1850, 1050)
  }

  private applyTechGradientTemplate(ctx: CanvasRenderingContext2D, slide: any, slideNumber: number) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
    gradient.addColorStop(0, '#0EA5E9')
    gradient.addColorStop(1, '#8B5CF6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Title
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 72px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(slide.title || `Slide ${slideNumber}`, 960, 300)
    
    // Content
    if (slide.points && slide.points.length > 0) {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '32px Arial'
      ctx.textAlign = 'left'
      
      slide.points.slice(0, 4).forEach((point: string, index: number) => {
        const y = 450 + (index * 80)
        ctx.fillText(`▶ ${point}`, 200, y)
      })
    }
  }

  private applyCreativeBoldTemplate(ctx: CanvasRenderingContext2D, slide: any, slideNumber: number) {
    // Background
    ctx.fillStyle = '#FEFCE8'
    ctx.fillRect(0, 0, 1920, 1080)
    
    // Decorative elements
    ctx.fillStyle = '#EC4899'
    ctx.beginPath()
    ctx.arc(1700, 200, 150, 0, 2 * Math.PI)
    ctx.fill()
    
    // Title
    ctx.fillStyle = '#EC4899'
    ctx.font = 'bold 68px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(slide.title || `Slide ${slideNumber}`, 100, 300)
    
    // Content
    if (slide.points && slide.points.length > 0) {
      ctx.fillStyle = '#1F2937'
      ctx.font = '30px Arial'
      ctx.textAlign = 'left'
      
      slide.points.slice(0, 4).forEach((point: string, index: number) => {
        const y = 450 + (index * 70)
        // Creative bullet
        ctx.fillStyle = '#8B5CF6'
        ctx.beginPath()
        ctx.arc(130, y - 15, 12, 0, 2 * Math.PI)
        ctx.fill()
        
        ctx.fillStyle = '#1F2937'
        ctx.fillText(point, 170, y)
      })
    }
  }

  private async createFallbackSlideImage(slide: any, slideNumber: number): Promise<Uint8Array> {
    // Create a simple fallback image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = 1920
    canvas.height = 1080
    
    // Simple design
    ctx.fillStyle = '#F3F4F6'
    ctx.fillRect(0, 0, 1920, 1080)
    
    ctx.fillStyle = '#1F2937'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(slide.title || `Slide ${slideNumber}`, 960, 540)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to create fallback slide image'))
          return
        }
        
        const arrayBuffer = await blob.arrayBuffer()
        resolve(new Uint8Array(arrayBuffer))
      }, 'image/png')
    })
  }

  private async assembleVideoWithFFmpeg(
    slideImages: Uint8Array[],
    audioFile: Uint8Array,
    options: RealVideoOptions
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized')
    }

    try {
      // Write audio file
      await this.ffmpeg.writeFile('audio.mp3', audioFile)
      
      // Write slide images
      for (let i = 0; i < slideImages.length; i++) {
        await this.ffmpeg.writeFile(`slide_${i.toString().padStart(3, '0')}.png`, slideImages[i])
      }
      
      // Create video from images
      const fps = options.fps || 30
      const resolution = this.getResolutionDimensions(options.resolution)
      
      // FFmpeg command to create video from images
      await this.ffmpeg.exec([
        '-framerate', '1/3', // 3 seconds per image
        '-i', 'slide_%03d.png',
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-r', fps.toString(),
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-shortest',
        '-s', `${resolution.width}x${resolution.height}`,
        'output.mp4'
      ])
      
      // Read the output file
      const data = await this.ffmpeg.readFile('output.mp4')
      
      // Clean up temporary files
      await this.cleanupTempFiles(slideImages.length)
      
      return new Blob([data], { type: 'video/mp4' })
    } catch (error) {
      throw new Error(`Video assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getResolutionDimensions(resolution: string): { width: number; height: number } {
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

  private async cleanupTempFiles(slideCount: number) {
    try {
      // Remove temporary files
      await this.ffmpeg.deleteFile('audio.mp3')
      
      for (let i = 0; i < slideCount; i++) {
        await this.ffmpeg.deleteFile(`slide_${i.toString().padStart(3, '0')}.png`)
      }
      
      await this.ffmpeg.deleteFile('output.mp4')
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error)
    }
  }

  private async uploadVideo(videoBlob: Blob, topic: string): Promise<string> {
    try {
      if (!blink?.storage) {
        throw new Error('Storage service not available')
      }

      const filename = `webinar_${topic.replace(/\\s+/g, '_').toLowerCase()}_${Date.now()}.mp4`
      const { publicUrl } = await blink.storage.upload(videoBlob, `videos/${filename}`, { upsert: true })
      
      return publicUrl
    } catch (error) {
      throw new Error(`Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private updateProgress(
    onProgress: ((progress: VideoGenerationProgress) => void) | undefined,
    stage: VideoGenerationProgress['stage'],
    progress: number,
    message: string
  ) {
    if (onProgress) {
      onProgress({ stage, progress, message })
    }
  }
}