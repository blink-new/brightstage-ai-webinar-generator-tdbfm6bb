import PptxGenJS from 'pptxgenjs'
import { WebinarTemplate } from './webinarTemplates'

export interface GeneratedSlide {
  id: string
  title: string
  content: string[]
  notes?: string
  imageUrl?: string
  chartData?: any
  type: 'title' | 'content' | 'image' | 'chart' | 'conclusion'
}

export interface WebinarData {
  title: string
  slides: GeneratedSlide[]
  template: WebinarTemplate | string
  duration: number
  audience: string
}

export interface PPTXGenerationResult {
  success: boolean
  blob?: Blob
  filename: string
  slideCount: number
  error?: string
}

export class PPTXGenerator {
  private pptx: PptxGenJS

  constructor() {
    this.pptx = new PptxGenJS()
  }

  /**
   * Generate PPTX from webinar data with proper error handling
   */
  async generatePPTX(data: WebinarData, templateOverride?: any): Promise<PPTXGenerationResult> {
    try {
      console.log('Starting PPTX generation with data:', {
        title: data.title,
        slideCount: data.slides?.length || 0,
        template: data.template,
        hasSlides: !!data.slides
      })
      
      // Validate input data first
      this.validateWebinarData(data)
      
      // Normalize slide data to ensure consistent format
      const normalizedData = this.normalizeWebinarData(data)
      console.log('Normalized data:', {
        title: normalizedData.title,
        slideCount: normalizedData.slides.length,
        firstSlide: normalizedData.slides[0]
      })
      
      // Resolve template if it's a string ID
      const resolvedTemplate = this.resolveTemplate(normalizedData.template, templateOverride)
      console.log('Resolved template:', {
        id: resolvedTemplate.id,
        name: resolvedTemplate.name,
        colors: resolvedTemplate.colors
      })
      
      // Configure presentation
      this.configurePresentationSettings(normalizedData)
      
      // Generate slides with resolved template
      await this.generateSlides(normalizedData, resolvedTemplate)
      
      // Create blob with validation
      const blob = await this.createValidatedBlob()
      
      const filename = this.sanitizeFilename(`${normalizedData.title}.pptx`)
      
      return {
        success: true,
        blob,
        filename,
        slideCount: normalizedData.slides.length,
      }
    } catch (error) {
      console.error('PPTX Generation failed:', error)
      
      // Try fallback method for critical failures
      try {
        console.log('Attempting fallback PPTX generation...')
        const fallbackResult = await this.generateFallbackPPTX(data)
        if (fallbackResult.success) {
          return fallbackResult
        }
      } catch (fallbackError) {
        console.error('Fallback PPTX generation also failed:', fallbackError)
      }
      
      return {
        success: false,
        filename: '',
        slideCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Fallback PPTX generation with minimal configuration
   */
  private async generateFallbackPPTX(data: WebinarData): Promise<PPTXGenerationResult> {
    try {
      console.log('Creating fallback PPTX with minimal configuration...')
      
      // Create a new, clean instance
      const fallbackPptx = new PptxGenJS()
      
      // Minimal configuration
      fallbackPptx.author = 'BrightStage AI'
      fallbackPptx.title = data.title
      
      // Add slides with minimal formatting
      data.slides.forEach((slide, index) => {
        const pptxSlide = fallbackPptx.addSlide()
        
        // Add title
        pptxSlide.addText(slide.title || `Slide ${index + 1}`, {
          x: 0.5, y: 0.5, w: 9, h: 1,
          fontSize: 24,
          bold: true,
          color: '333333'
        })
        
        // Add content
        if (slide.content && slide.content.length > 0) {
          const contentText = slide.content.map(item => `• ${item}`).join('\n')
          pptxSlide.addText(contentText, {
            x: 0.5, y: 1.8, w: 9, h: 3,
            fontSize: 16,
            color: '666666'
          })
        }
        
        // Add slide number
        pptxSlide.addText((index + 1).toString(), {
          x: 9, y: 5, w: 0.5, h: 0.3,
          fontSize: 10,
          color: '999999'
        })
      })
      
      // Create blob using correct pptxgenjs API
      let blob: Blob
      try {
        blob = await fallbackPptx.write({ outputType: 'blob' })
      } catch {
        // If blob fails, try arraybuffer
        const arrayBuffer = await fallbackPptx.write({ outputType: 'arraybuffer' })
        blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      }
      
      const filename = this.sanitizeFilename(`${data.title}_fallback.pptx`)
      
      console.log('Fallback PPTX created successfully')
      
      return {
        success: true,
        blob,
        filename,
        slideCount: data.slides.length,
      }
    } catch (error) {
      console.error('Fallback PPTX generation failed:', error)
      throw new Error(`Fallback generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Resolve template from string ID or use provided template
   */
  private resolveTemplate(template: WebinarTemplate | string, templateOverride?: any): WebinarTemplate {
    if (templateOverride) {
      console.log('Using template override')
      return templateOverride
    }
    
    if (typeof template === 'string') {
      console.log(`Resolving template string: ${template}`)
      
      // Try to get template from WEBINAR_TEMPLATES
      try {
        const { WEBINAR_TEMPLATES } = require('./webinarTemplates')
        const foundTemplate = WEBINAR_TEMPLATES.find((t: any) => t.id === template)
        if (foundTemplate) {
          console.log(`Found template in WEBINAR_TEMPLATES: ${foundTemplate.name}`)
          return foundTemplate
        }
      } catch (error) {
        console.warn('Could not load WEBINAR_TEMPLATES:', error)
      }
      
      // Create a default template structure based on template ID
      const templateColors = this.getTemplateColors(template)
      console.log(`Creating default template with colors:`, templateColors)
      
      return {
        id: template,
        name: template.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: 'Professional template',
        category: 'business',
        colors: templateColors,
        fonts: {
          heading: 'Arial',
          body: 'Arial'
        },
        layout: {
          titleSlide: 'centered',
          contentSlides: 'bullet-points',
          spacing: 'normal'
        },
        features: ['Professional', 'Clean', 'Modern'],
        preview: '',
        slideStructure: {
          titleSlide: { layout: 'centered', elements: [] },
          contentSlide: { layout: 'bullet-points', elements: [] },
          sectionBreak: { layout: 'centered', elements: [] },
          conclusionSlide: { layout: 'centered', elements: [] }
        }
      }
    }
    
    console.log('Using provided template object')
    return template
  }

  /**
   * Get appropriate colors based on template ID
   */
  private getTemplateColors(templateId: string): any {
    const colorSchemes: Record<string, any> = {
      'modern-business': {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'creative-bold': {
        primary: '#7C3AED',
        secondary: '#A855F7',
        accent: '#EF4444',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'minimal-clean': {
        primary: '#374151',
        secondary: '#6B7280',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#111827'
      },
      'tech-innovation': {
        primary: '#0EA5E9',
        secondary: '#06B6D4',
        accent: '#8B5CF6',
        background: '#FFFFFF',
        text: '#0F172A'
      },
      'corporate-professional': {
        primary: '#1F2937',
        secondary: '#374151',
        accent: '#DC2626',
        background: '#FFFFFF',
        text: '#111827'
      }
    }
    
    return colorSchemes[templateId] || colorSchemes['modern-business']
  }

  /**
   * Normalize webinar data to ensure consistent format for PPTX generation
   */
  private normalizeWebinarData(data: WebinarData): WebinarData {
    console.log('Normalizing webinar data...')
    
    const normalizedSlides = data.slides?.map((slide: any, index: number) => {
      // Handle different slide data formats from SlideGenerator vs manual input
      const normalizedSlide: GeneratedSlide = {
        id: slide.id || `slide-${index + 1}`,
        title: slide.title || `Slide ${index + 1}`,
        content: this.normalizeSlideContent(slide),
        notes: slide.notes || `Speaker notes for ${slide.title || `Slide ${index + 1}`}`,
        imageUrl: slide.image?.url || slide.imageUrl,
        chartData: slide.chart || slide.chartData,
        type: this.determineSlideType(slide, index, data.slides?.length || 1)
      }
      
      console.log(`Normalized slide ${index + 1}:`, {
        id: normalizedSlide.id,
        title: normalizedSlide.title,
        contentLength: normalizedSlide.content.length,
        type: normalizedSlide.type,
        hasImage: !!normalizedSlide.imageUrl,
        hasChart: !!normalizedSlide.chartData
      })
      
      return normalizedSlide
    }) || []
    
    return {
      ...data,
      title: data.title || data.topic || 'Untitled Webinar',
      slides: normalizedSlides,
      template: data.template || 'modern-business'
    }
  }

  /**
   * Normalize slide content from various formats to string array
   */
  private normalizeSlideContent(slide: any): string[] {
    // Priority order: points > content > subtitle > fallback
    if (Array.isArray(slide.points) && slide.points.length > 0) {
      return slide.points.filter((point: any) => point && typeof point === 'string')
    }
    
    if (Array.isArray(slide.content) && slide.content.length > 0) {
      return slide.content.filter((item: any) => item && typeof item === 'string')
    }
    
    if (typeof slide.content === 'string' && slide.content.trim()) {
      return [slide.content.trim()]
    }
    
    if (typeof slide.subtitle === 'string' && slide.subtitle.trim()) {
      return [slide.subtitle.trim()]
    }
    
    // Fallback content
    return ['Content for this slide']
  }

  /**
   * Determine slide type based on position and content
   */
  private determineSlideType(slide: any, index: number, totalSlides: number): 'title' | 'content' | 'image' | 'chart' | 'conclusion' {
    // Explicit type from slide data
    if (slide.type && ['title', 'content', 'image', 'chart', 'conclusion'].includes(slide.type)) {
      return slide.type
    }
    
    // First slide is usually title
    if (index === 0) {
      return 'title'
    }
    
    // Last slide is usually conclusion
    if (index === totalSlides - 1) {
      return 'conclusion'
    }
    
    // Slides with images
    if (slide.image?.url || slide.imageUrl) {
      return 'image'
    }
    
    // Slides with charts
    if (slide.chart || slide.chartData) {
      return 'chart'
    }
    
    // Default to content slide
    return 'content'
  }

  /**
   * Validate webinar data - fail fast if data is invalid
   */
  private validateWebinarData(data: WebinarData): void {
    if (!data) {
      throw new Error('Webinar data is required')
    }
    
    if (!data.title && !data.topic) {
      throw new Error('Webinar title or topic is required')
    }
    
    if (!Array.isArray(data.slides) || data.slides.length === 0) {
      throw new Error('At least one slide is required')
    }
    
    // Validate each slide has minimum required fields
    data.slides.forEach((slide, index) => {
      if (!slide.title && !slide.id) {
        throw new Error(`Slide ${index + 1} is missing both title and id`)
      }
    })
  }

  /**
   * Configure presentation settings
   */
  private configurePresentationSettings(data: WebinarData): void {
    // Set presentation properties
    this.pptx.author = 'BrightStage AI'
    this.pptx.company = 'BrightStage AI'
    this.pptx.title = data.title
    this.pptx.subject = `AI-Generated Webinar: ${data.title}`
    
    // Set slide size (16:9 widescreen) - use correct pptxgenjs v4 API
    this.pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 })
    this.pptx.layout = 'LAYOUT_16x9'
  }

  /**
   * Generate all slides with chunked processing to prevent blocking and memory overload
   */
  private async generateSlides(data: WebinarData, template: WebinarTemplate): Promise<void> {
    const chunkSize = 2 // Reduced chunk size to prevent memory overload
    const totalSlides = data.slides.length
    
    console.log(`Processing ${totalSlides} slides in chunks of ${chunkSize}`)
    
    for (let i = 0; i < totalSlides; i += chunkSize) {
      const chunk = data.slides.slice(i, i + chunkSize)
      
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(totalSlides / chunkSize)} (slides ${i + 1}-${Math.min(i + chunkSize, totalSlides)})`)
      
      // Process chunk with memory management
      await this.processSlideChunkWithMemoryManagement(chunk, template, i)
      
      // Force garbage collection and UI update between chunks
      if (i + chunkSize < totalSlides) {
        await this.yieldToMainThread(50) // 50ms delay for UI updates
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc()
        }
      }
    }
    
    console.log('All slides processed successfully')
  }

  /**
   * Process a chunk of slides with proper memory management
   */
  private async processSlideChunkWithMemoryManagement(
    chunk: GeneratedSlide[],
    template: WebinarTemplate,
    startIndex: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use requestIdleCallback if available, otherwise requestAnimationFrame
      const processChunk = async () => {
        try {
          for (let j = 0; j < chunk.length; j++) {
            const slide = chunk[j]
            const slideIndex = startIndex + j
            
            // Create slide with memory-conscious approach
            await this.createSlideWithMemoryManagement(slide, template, slideIndex + 1)
            
            // Yield to main thread between slides within chunk
            if (j < chunk.length - 1) {
              await this.yieldToMainThread(5)
            }
          }
          resolve()
        } catch (error) {
          reject(new Error(`Failed to create slide chunk starting at ${startIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }

      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processChunk(), { timeout: 1000 })
      } else {
        requestAnimationFrame(() => processChunk())
      }
    })
  }

  /**
   * Create a single slide with memory management
   */
  private async createSlideWithMemoryManagement(slide: GeneratedSlide, template: WebinarTemplate, slideNumber: number): Promise<void> {
    try {
      const pptxSlide = this.pptx.addSlide()
      
      // Set background with validation
      if (template.colors?.background) {
        const cleanBg = this.cleanColor(template.colors.background)
        if (cleanBg) {
          pptxSlide.background = { fill: cleanBg }
        }
      }
      
      // Add slide content based on type with memory-conscious approach
      await this.addSlideContentMemoryConscious(pptxSlide, slide, template, slideNumber)
      
      // Add slide notes if present (limit size to prevent memory issues)
      if (slide.notes) {
        const truncatedNotes = slide.notes.length > 500 
          ? slide.notes.substring(0, 500) + '...'
          : slide.notes
        pptxSlide.addNotes(truncatedNotes)
      }
      
      // Add slide number
      pptxSlide.addText(slideNumber.toString(), {
        x: 9.5, y: 5.2, w: 0.4, h: 0.3,
        fontSize: 10,
        color: this.cleanColor(template.colors?.text || '#666666'),
        align: 'right'
      })
      
    } catch (error) {
      console.error(`Error creating slide ${slideNumber}:`, error)
      throw error
    }
  }

  /**
   * Add slide content with memory-conscious approach
   */
  private async addSlideContentMemoryConscious(
    pptxSlide: any, 
    slide: GeneratedSlide, 
    template: WebinarTemplate, 
    slideNumber: number
  ): Promise<void> {
    switch (slide.type) {
      case 'title':
        this.addTitleSlideContent(pptxSlide, slide, template)
        break
      case 'content':
        this.addContentSlideContent(pptxSlide, slide, template)
        break
      case 'image':
        // Skip image processing for memory efficiency - add placeholder instead
        this.addImagePlaceholderContent(pptxSlide, slide, template)
        break
      case 'chart':
        this.addChartSlideContent(pptxSlide, slide, template)
        break
      case 'conclusion':
        this.addConclusionSlideContent(pptxSlide, slide, template)
        break
      default:
        this.addContentSlideContent(pptxSlide, slide, template)
    }
  }

  /**
   * Add image placeholder instead of loading actual images to prevent memory issues
   */
  private addImagePlaceholderContent(pptxSlide: any, slide: GeneratedSlide, template: WebinarTemplate): void {
    // Title
    pptxSlide.addText(slide.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28,
      bold: true,
      color: this.cleanColor(template.colors?.primary || '#333333'),
      fontFace: 'Arial'
    })
    
    // Image placeholder
    pptxSlide.addText('[Image Placeholder]', {
      x: 1.5, y: 2.5, w: 7, h: 2,
      fontSize: 24,
      color: this.cleanColor('#999999'),
      align: 'center',
      fontFace: 'Arial',
      fill: { color: this.cleanColor('#F0F0F0') }
    })
    
    if (slide.imageUrl) {
      pptxSlide.addText(`Image URL: ${slide.imageUrl}`, {
        x: 1.5, y: 4.8, w: 7, h: 0.4,
        fontSize: 10,
        color: this.cleanColor('#666666'),
        align: 'center',
        fontFace: 'Arial'
      })
    }
    
    // Content below image
    if (slide.content.length > 0) {
      const limitedContent = slide.content.slice(0, 3).join(' ') // Limit content to prevent memory issues
      pptxSlide.addText(limitedContent, {
        x: 0.8, y: 5.2, w: 8.4, h: 0.6,
        fontSize: 14,
        color: this.cleanColor(template.colors?.text || '#333333'),
        align: 'center',
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Yield control to main thread to prevent blocking
   */
  private async yieldToMainThread(ms: number = 0): Promise<void> {
    return new Promise(resolve => {
      if (ms > 0) {
        setTimeout(resolve, ms)
      } else {
        // Use scheduler.postTask if available, otherwise setTimeout
        if ('scheduler' in window && 'postTask' in window.scheduler) {
          (window.scheduler as any).postTask(resolve, { priority: 'background' })
        } else {
          setTimeout(resolve, 0)
        }
      }
    })
  }

  /**
   * Create a single slide
   */
  private async createSlide(slide: GeneratedSlide, template: WebinarTemplate, slideNumber: number): Promise<void> {
    const pptxSlide = this.pptx.addSlide()
    
    // Set background
    if (template.colors?.background) {
      pptxSlide.background = { 
        fill: this.cleanColor(template.colors.background)
      }
    }
    
    // Add slide content based on type
    switch (slide.type) {
      case 'title':
        this.addTitleSlideContent(pptxSlide, slide, template)
        break
      case 'content':
        this.addContentSlideContent(pptxSlide, slide, template)
        break
      case 'image':
        await this.addImageSlideContent(pptxSlide, slide, template)
        break
      case 'chart':
        this.addChartSlideContent(pptxSlide, slide, template)
        break
      case 'conclusion':
        this.addConclusionSlideContent(pptxSlide, slide, template)
        break
      default:
        this.addContentSlideContent(pptxSlide, slide, template)
    }
    
    // Add slide notes if present
    if (slide.notes) {
      pptxSlide.addNotes(slide.notes)
    }
    
    // Add slide number
    pptxSlide.addText(slideNumber.toString(), {
      x: 9.5, y: 5.2, w: 0.4, h: 0.3,
      fontSize: 10,
      color: this.cleanColor(template.colors?.text || '#666666'),
      align: 'right'
    })
  }

  /**
   * Add title slide content
   */
  private addTitleSlideContent(pptxSlide: any, slide: GeneratedSlide, template: WebinarTemplate): void {
    // Main title
    pptxSlide.addText(slide.title, {
      x: 1, y: 1.5, w: 8, h: 1.5,
      fontSize: 36,
      bold: true,
      color: this.cleanColor(template.colors?.primary || '#333333'),
      align: 'center',
      fontFace: 'Arial'
    })
    
    // Subtitle/content
    if (slide.content.length > 0) {
      pptxSlide.addText(slide.content.join('\n'), {
        x: 1, y: 3.2, w: 8, h: 1,
        fontSize: 18,
        color: this.cleanColor(template.colors?.text || '#666666'),
        align: 'center',
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Add content slide content
   */
  private addContentSlideContent(pptxSlide: any, slide: GeneratedSlide, template: WebinarTemplate): void {
    // Title
    pptxSlide.addText(slide.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28,
      bold: true,
      color: this.cleanColor(template.colors?.primary || '#333333'),
      fontFace: 'Arial'
    })
    
    // Content bullets
    if (slide.content.length > 0) {
      const bulletText = slide.content.map(item => `• ${item}`).join('\n')
      pptxSlide.addText(bulletText, {
        x: 0.8, y: 1.5, w: 8.4, h: 3.5,
        fontSize: 18,
        color: this.cleanColor(template.colors?.text || '#333333'),
        lineSpacing: 28,
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Add image slide content
   */
  private async addImageSlideContent(pptxSlide: any, slide: GeneratedSlide, template: WebinarTemplate): Promise<void> {
    // Title
    pptxSlide.addText(slide.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28,
      bold: true,
      color: this.cleanColor(template.colors?.primary || '#333333'),
      fontFace: 'Arial'
    })
    
    // Image (if URL is provided and accessible)
    if (slide.imageUrl) {
      try {
        // Validate image URL is accessible
        await this.validateImageUrl(slide.imageUrl)
        
        pptxSlide.addImage({
          path: slide.imageUrl,
          x: 1.5, y: 1.5, w: 7, h: 3,
          sizing: { type: 'contain', w: 7, h: 3 }
        })
      } catch (error) {
        // If image fails, add placeholder text
        pptxSlide.addText('Image could not be loaded', {
          x: 1.5, y: 3, w: 7, h: 1,
          fontSize: 16,
          color: this.cleanColor('#999999'),
          align: 'center',
          fontFace: 'Arial'
        })
      }
    }
    
    // Content below image
    if (slide.content.length > 0) {
      pptxSlide.addText(slide.content.join(' '), {
        x: 0.8, y: 4.8, w: 8.4, h: 0.6,
        fontSize: 14,
        color: this.cleanColor(template.colors?.text || '#333333'),
        align: 'center',
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Add chart slide content
   */
  private addChartSlideContent(pptxSlide: any, slide: GeneratedSlide, template: WebinarTemplate): void {
    // Title
    pptxSlide.addText(slide.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28,
      bold: true,
      color: this.cleanColor(template.colors?.primary || '#333333'),
      fontFace: 'Arial'
    })
    
    // Chart (simplified - just add placeholder for now)
    if (slide.chartData) {
      pptxSlide.addText('Chart: ' + (slide.chartData.title || 'Data Visualization'), {
        x: 2, y: 2.5, w: 6, h: 1,
        fontSize: 20,
        color: this.cleanColor(template.colors?.primary || '#333333'),
        align: 'center',
        fontFace: 'Arial',
        fill: { color: this.cleanColor('#F0F0F0') }
      })
    }
    
    // Content
    if (slide.content.length > 0) {
      pptxSlide.addText(slide.content.join('\n'), {
        x: 0.8, y: 4, w: 8.4, h: 1.2,
        fontSize: 14,
        color: this.cleanColor(template.colors?.text || '#333333'),
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Add conclusion slide content
   */
  private addConclusionSlideContent(pptxSlide: any, slide: GeneratedSlide, template: WebinarTemplate): void {
    // Title
    pptxSlide.addText(slide.title, {
      x: 1, y: 1, w: 8, h: 1,
      fontSize: 32,
      bold: true,
      color: this.cleanColor(template.colors?.primary || '#333333'),
      align: 'center',
      fontFace: 'Arial'
    })
    
    // Key points
    if (slide.content.length > 0) {
      const bulletText = slide.content.map(item => `✓ ${item}`).join('\n')
      pptxSlide.addText(bulletText, {
        x: 1.5, y: 2.5, w: 7, h: 2.5,
        fontSize: 18,
        color: this.cleanColor(template.colors?.text || '#333333'),
        lineSpacing: 32,
        align: 'left',
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Create and validate the final blob using the correct pptxgenjs API
   */
  private async createValidatedBlob(): Promise<Blob> {
    console.log('=== BLOB CREATION DEBUG ===')
    console.log('Starting PPTX blob creation...')
    console.log('PPTX instance state:', {
      hasSlides: this.pptx.slides && this.pptx.slides.length > 0,
      slideCount: this.pptx.slides ? this.pptx.slides.length : 0,
      author: this.pptx.author,
      title: this.pptx.title
    })

    const methods = [
      { outputType: 'blob', compression: false },
      { outputType: 'blob', compression: true },
      { outputType: 'arraybuffer', compression: false },
      { outputType: 'arraybuffer', compression: true },
      { outputType: 'base64', compression: false },
      { outputType: 'base64', compression: true }
    ]

    let blob: Blob | null = null
    let lastError: Error | null = null
    const attemptResults: string[] = []

    for (const method of methods) {
      try {
        console.log(`Attempting ${method.outputType} with compression: ${method.compression}`)
        const startTime = Date.now()

        const result = await this.pptx.write({
          outputType: method.outputType as any,
          compression: method.compression
        })

        const duration = Date.now() - startTime
        console.log(`${method.outputType} attempt took ${duration}ms`)
        console.log('Result type:', typeof result, result?.constructor?.name)

        if (method.outputType === 'blob') {
          if (result instanceof Blob && result.size > 0) {
            blob = result
            attemptResults.push(`✓ Blob: ${result.size} bytes`)
          } else {
            throw new Error(`write returned invalid Blob (size: ${result?.size || 0})`)
          }
        } else if (method.outputType === 'arraybuffer') {
          if (result instanceof ArrayBuffer && result.byteLength > 0) {
            blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
            attemptResults.push(`✓ ArrayBuffer: ${result.byteLength} bytes → Blob: ${blob.size} bytes`)
          } else {
            throw new Error('write returned invalid ArrayBuffer')
          }
        } else if (method.outputType === 'base64') {
          if (typeof result === 'string' && result.length > 0) {
            const cleanBase64 = this.validateAndCleanBase64(result)
            if (cleanBase64) {
              blob = this.base64ToBlob(cleanBase64)
              attemptResults.push(`✓ Base64: ${result.length} chars → Blob: ${blob.size} bytes`)
            } else {
              throw new Error('Invalid base64 data from write')
            }
          } else {
            throw new Error('write returned invalid base64 string')
          }
        }

        if (blob) {
          console.log('=== BLOB CREATION SUCCESS ===')
          return blob
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown method error')
        attemptResults.push(`✗ ${method.outputType}: ${lastError.message}`)
        console.warn(`${method.outputType} failed:`, lastError.message)
      }
    }

    const errorSummary = `All methods failed:\n${attemptResults.join('\n')}\nLast error: ${lastError?.message}`
    console.error('=== BLOB CREATION FAILED ===', errorSummary)
    throw new Error(errorSummary)
  }

  /**
   * Validate and clean base64 string
   */
  private validateAndCleanBase64(base64String: string): string | null {
    try {
      if (!base64String || typeof base64String !== 'string') {
        console.warn('Invalid base64 input: not a string')
        return null
      }
      
      // Remove any whitespace and newlines
      let cleaned = base64String.replace(/\s/g, '')
      
      // Remove data URL prefix if present
      if (cleaned.startsWith('data:')) {
        const commaIndex = cleaned.indexOf(',')
        if (commaIndex !== -1) {
          cleaned = cleaned.substring(commaIndex + 1)
        }
      }
      
      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(cleaned)) {
        console.warn('Invalid base64 format: contains invalid characters')
        return null
      }
      
      // Ensure proper padding
      while (cleaned.length % 4 !== 0) {
        cleaned += '='
      }
      
      // Test decode without actually decoding the full string
      try {
        // Test with a small portion first
        const testPortion = cleaned.substring(0, Math.min(100, cleaned.length))
        atob(testPortion)
        console.log('Base64 validation successful')
        return cleaned
      } catch (testError) {
        console.warn('Base64 test decode failed:', testError)
        return null
      }
    } catch (error) {
      console.warn('Base64 validation error:', error)
      return null
    }
  }

  /**
   * Convert base64 to blob using safer method
   */
  private base64ToBlob(base64String: string): Blob {
    try {
      // Decode base64 to binary string
      const binaryString = atob(base64String)
      
      // Convert to Uint8Array
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Create blob
      return new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      })
    } catch (error) {
      throw new Error(`Failed to convert base64 to blob: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate that an image URL is accessible
   */
  private async validateImageUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Image not accessible: ${url}`))
      img.src = url
      
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error(`Image load timeout: ${url}`)), 5000)
    })
  }

  /**
   * Clean and validate color values
   */
  private cleanColor(color: string): string {
    if (!color) return '333333'
    
    // Remove # if present
    const cleaned = color.replace('#', '')
    
    // Validate hex color format
    if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
      console.warn(`Invalid color format: ${color}, using default`)
      return '333333'
    }
    
    return cleaned
  }

  /**
   * Sanitize filename for safe download
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\-_.]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100) // Limit length
  }

  /**
   * Test PPTX generation with minimal data
   */
  static async testPPTXGeneration(): Promise<PPTXGenerationResult> {
    try {
      console.log('=== STARTING TEST PPTX GENERATION ===')
      
      const testData: WebinarData = {
        title: 'Test Webinar',
        slides: [
          {
            id: 'slide-1',
            title: 'Welcome to Test Webinar',
            content: ['This is a test slide', 'Generated by BrightStage AI'],
            type: 'title'
          },
          {
            id: 'slide-2',
            title: 'Test Content',
            content: ['Point 1: Testing PPTX generation', 'Point 2: Ensuring blob creation works'],
            type: 'content'
          }
        ],
        template: 'modern-business', // Use string template ID for simplicity
        duration: 10,
        audience: 'Test Audience'
      }
      
      console.log('Test data prepared:', {
        title: testData.title,
        slideCount: testData.slides.length,
        template: testData.template
      })
      
      const generator = new PPTXGenerator()
      const result = await generator.generatePPTX(testData)
      
      console.log('=== TEST PPTX GENERATION COMPLETE ===')
      console.log('Result:', {
        success: result.success,
        slideCount: result.slideCount,
        filename: result.filename,
        blobSize: result.blob?.size,
        error: result.error
      })
      
      return result
    } catch (error) {
      console.error('=== TEST PPTX GENERATION FAILED ===')
      console.error('Test error:', error)
      return {
        success: false,
        filename: 'test-failed.pptx',
        slideCount: 0,
        error: error instanceof Error ? error.message : 'Test generation failed'
      }
    }
  }

  /**
   * Download the generated PPTX file with improved memory management
   */
  static downloadPPTX(blob: Blob, filename: string): void {
    try {
      console.log('=== STARTING PPTX DOWNLOAD ===')
      console.log('Download parameters:', {
        blobSize: blob?.size,
        blobType: blob?.type,
        filename: filename,
        isBlob: blob instanceof Blob
      })
      
      // Validate inputs
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Invalid blob provided for download')
      }
      
      if (!filename || typeof filename !== 'string') {
        throw new Error('Invalid filename provided for download')
      }
      
      if (blob.size === 0) {
        throw new Error('Cannot download empty file')
      }
      
      // Use requestAnimationFrame to prevent blocking during URL creation
      requestAnimationFrame(() => {
        let url: string | null = null
        let link: HTMLAnchorElement | null = null
        
        try {
          // Create object URL with error handling
          url = URL.createObjectURL(blob)
          console.log('Created object URL:', url.substring(0, 50) + '...')
          
          // Create and trigger download
          link = document.createElement('a')
          link.href = url
          link.download = filename
          link.style.display = 'none' // Hide the link
          
          // Add to DOM, click, and cleanup
          document.body.appendChild(link)
          console.log('Added download link to DOM, triggering click...')
          
          // Force the download by simulating user interaction
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          })
          link.dispatchEvent(clickEvent)
          
          console.log('Download triggered successfully')
          
        } catch (downloadError) {
          console.error('Download process failed:', downloadError)
          // Fallback to direct click if available
          if (link) {
            try {
              link.click()
            } catch (fallbackError) {
              console.error('Fallback click also failed:', fallbackError)
            }
          }
        } finally {
          // Immediate cleanup to prevent memory leaks
          const cleanup = () => {
            try {
              if (link && document.body.contains(link)) {
                document.body.removeChild(link)
              }
              if (url) {
                URL.revokeObjectURL(url)
              }
              console.log('Download cleanup completed')
            } catch (cleanupError) {
              console.warn('Cleanup error (non-critical):', cleanupError)
            }
          }
          
          // Cleanup after a short delay to ensure download starts
          setTimeout(cleanup, 1000)
          
          // Also cleanup on page unload as a safety measure
          const unloadHandler = () => {
            cleanup()
            window.removeEventListener('beforeunload', unloadHandler)
          }
          window.addEventListener('beforeunload', unloadHandler)
        }
      })
      
    } catch (error) {
      console.error('=== PPTX DOWNLOAD ERROR ===')
      console.error('Download error details:', error)
      throw new Error(`Failed to download PPTX: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Remove the mock PPTXParser entirely - either implement properly or don't include
// export class PPTXParser {
//   // This was completely fake - removing until we can implement properly
// }