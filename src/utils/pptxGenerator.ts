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
  template: WebinarTemplate
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
  async generatePPTX(data: WebinarData): Promise<PPTXGenerationResult> {
    try {
      // Validate input data first
      this.validateWebinarData(data)
      
      // Configure presentation
      this.configurePresentationSettings(data)
      
      // Generate slides
      await this.generateSlides(data)
      
      // Create blob with validation
      const blob = await this.createValidatedBlob()
      
      const filename = this.sanitizeFilename(`${data.title}.pptx`)
      
      return {
        success: true,
        blob,
        filename,
        slideCount: data.slides.length,
      }
    } catch (error) {
      console.error('PPTX Generation failed:', error)
      return {
        success: false,
        filename: '',
        slideCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Validate webinar data - fail fast if data is invalid
   */
  private validateWebinarData(data: WebinarData): void {
    if (!data) {
      throw new Error('Webinar data is required')
    }
    
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Webinar title is required and must be a non-empty string')
    }
    
    if (!Array.isArray(data.slides) || data.slides.length === 0) {
      throw new Error('At least one slide is required')
    }
    
    if (!data.template) {
      throw new Error('Template is required')
    }
    
    // Validate each slide
    data.slides.forEach((slide, index) => {
      if (!slide.id || !slide.title) {
        throw new Error(`Slide ${index + 1} is missing required id or title`)
      }
      
      if (!Array.isArray(slide.content)) {
        throw new Error(`Slide ${index + 1} content must be an array`)
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
    
    // Set slide size (16:9 widescreen)
    this.pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 })
    this.pptx.layout = 'LAYOUT_16x9'
  }

  /**
   * Generate all slides
   */
  private async generateSlides(data: WebinarData): Promise<void> {
    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i]
      try {
        await this.createSlide(slide, data.template, i + 1)
      } catch (error) {
        throw new Error(`Failed to create slide ${i + 1} (${slide.title}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  /**
   * Create a single slide
   */
  private async createSlide(slide: GeneratedSlide, template: WebinarTemplate, slideNumber: number): Promise<void> {
    const pptxSlide = this.pptx.addSlide()
    
    // Set background
    if (template.background) {
      pptxSlide.background = { 
        fill: this.cleanColor(template.background)
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
      color: this.cleanColor(template.textColor || '#666666'),
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
      color: this.cleanColor(template.primaryColor || '#333333'),
      align: 'center',
      fontFace: 'Arial'
    })
    
    // Subtitle/content
    if (slide.content.length > 0) {
      pptxSlide.addText(slide.content.join('\n'), {
        x: 1, y: 3.2, w: 8, h: 1,
        fontSize: 18,
        color: this.cleanColor(template.textColor || '#666666'),
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
      color: this.cleanColor(template.primaryColor || '#333333'),
      fontFace: 'Arial'
    })
    
    // Content bullets
    if (slide.content.length > 0) {
      const bulletText = slide.content.map(item => `• ${item}`).join('\n')
      pptxSlide.addText(bulletText, {
        x: 0.8, y: 1.5, w: 8.4, h: 3.5,
        fontSize: 18,
        color: this.cleanColor(template.textColor || '#333333'),
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
      color: this.cleanColor(template.primaryColor || '#333333'),
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
        color: this.cleanColor(template.textColor || '#333333'),
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
      color: this.cleanColor(template.primaryColor || '#333333'),
      fontFace: 'Arial'
    })
    
    // Chart (simplified - just add placeholder for now)
    if (slide.chartData) {
      pptxSlide.addText('Chart: ' + (slide.chartData.title || 'Data Visualization'), {
        x: 2, y: 2.5, w: 6, h: 1,
        fontSize: 20,
        color: this.cleanColor(template.primaryColor || '#333333'),
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
        color: this.cleanColor(template.textColor || '#333333'),
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
      color: this.cleanColor(template.primaryColor || '#333333'),
      align: 'center',
      fontFace: 'Arial'
    })
    
    // Key points
    if (slide.content.length > 0) {
      const bulletText = slide.content.map(item => `✓ ${item}`).join('\n')
      pptxSlide.addText(bulletText, {
        x: 1.5, y: 2.5, w: 7, h: 2.5,
        fontSize: 18,
        color: this.cleanColor(template.textColor || '#333333'),
        lineSpacing: 32,
        align: 'left',
        fontFace: 'Arial'
      })
    }
  }

  /**
   * Create and validate the final blob
   */
  private async createValidatedBlob(): Promise<Blob> {
    const blob = await this.pptx.writeFile({ outputType: 'blob' }) as Blob
    
    if (!blob) {
      throw new Error('Failed to generate PPTX blob')
    }
    
    if (blob.size === 0) {
      throw new Error('Generated PPTX file is empty')
    }
    
    if (blob.size < 1000) { // Minimum reasonable size for a PPTX file
      throw new Error('Generated PPTX file appears to be corrupted (too small)')
    }
    
    // Validate MIME type
    if (blob.type && !blob.type.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
      console.warn('Generated blob has unexpected MIME type:', blob.type)
    }
    
    return blob
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
   * Download the generated PPTX file
   */
  static downloadPPTX(blob: Blob, filename: string): void {
    try {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      throw new Error(`Failed to download PPTX: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Remove the mock PPTXParser entirely - either implement properly or don't include
// export class PPTXParser {
//   // This was completely fake - removing until we can implement properly
// }