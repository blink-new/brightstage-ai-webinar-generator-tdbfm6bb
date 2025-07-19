import type { WebinarTemplate } from './webinarTemplates'
import { getTemplateById as getTemplate, WEBINAR_TEMPLATES } from './webinarTemplates'

export interface SlideGenerationOptions {
  templateId: string
  outline: any
  duration: number
  audience: string
  topic: string
  customBranding?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
  }
}

export interface GeneratedSlide {
  id: string
  type: 'title' | 'content' | 'section-break' | 'conclusion' | 'stats' | 'visual-story'
  title: string
  subtitle?: string
  points?: string[]
  duration: number
  notes: string
  template: any
  style: any
  visual?: string
  cta?: string
  animations?: any[]
  // Enhanced visual elements for webinars
  image?: {
    url: string
    alt: string
    caption?: string
    source: 'unsplash' | 'generated' | 'user'
  }
  statistics?: {
    value: string
    label: string
    source?: string
    trend?: 'up' | 'down' | 'stable'
  }[]
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'donut'
    data: any[]
    title: string
  }
  quote?: {
    text: string
    author: string
    role?: string
  }
}

// Get template by ID using direct import
function getTemplateById(id: string): WebinarTemplate | undefined {
  try {
    return getTemplate(id)
  } catch (error) {
    console.error('Failed to load templates:', error)
    return getDefaultTemplate()
  }
}

function getDefaultTemplate(): WebinarTemplate {
  return {
    id: 'default',
    name: 'Default Template',
    description: 'Fallback template',
    category: 'business',
    colors: {
      primary: '#1E40AF',
      secondary: '#3B82F6',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    layout: {
      titleSlide: 'centered',
      contentSlides: 'bullet-points',
      spacing: 'normal'
    },
    features: ['Basic layout', 'Professional colors'],
    preview: '',
    slideStructure: {
      titleSlide: {
        layout: 'centered',
        elements: []
      },
      contentSlide: {
        layout: 'split',
        elements: []
      },
      sectionBreak: {
        layout: 'centered',
        elements: []
      },
      conclusionSlide: {
        layout: 'centered',
        elements: []
      }
    }
  }
}

export class SlideGenerator {
  private template: WebinarTemplate
  private options: SlideGenerationOptions

  constructor(options: SlideGenerationOptions) {
    this.options = options
    const template = getTemplateById(options.templateId)
    if (!template) {
      console.warn(`Template with ID '${options.templateId}' not found, using default`)
      this.template = getDefaultTemplate()
    } else {
      this.template = template
    }
  }

  generateSlides(): GeneratedSlide[] {
    const baseSlides = this.generateSlideContent(
      this.options.outline,
      this.template,
      this.options.duration
    )

    return baseSlides.map((slide, index) => ({
      ...slide,
      id: `slide_${index + 1}_${Date.now()}`,
      ...this.applyCustomBranding(slide)
    }))
  }

  private generateSlideContent(outline: any, template: WebinarTemplate, duration: number): any[] {
    const slides: any[] = []
    const slidesPerMinute = 0.5 // Approximately 1 slide per 2 minutes
    const targetSlideCount = Math.max(3, Math.min(20, Math.floor(duration * slidesPerMinute)))

    // Title slide
    slides.push({
      type: 'title',
      title: outline.title || 'Webinar Title',
      subtitle: outline.subtitle || `For ${this.options.audience || 'Your Audience'}`,
      duration: 2,
      notes: `Welcome everyone to today's presentation on ${outline.title}. I'm excited to share this valuable content with you.`,
      template: template.slideStructure.titleSlide,
      style: template.colors
    })

    // Introduction slide
    if (outline.introduction) {
      slides.push({
        type: 'content',
        title: 'Introduction',
        points: [
          outline.introduction.hook || 'Welcome and introductions',
          'What we\'ll cover today',
          'Why this matters to you',
          'How to get the most from this session'
        ],
        duration: 3,
        notes: outline.introduction.notes || 'Let\'s start by setting the stage and explaining what you\'ll learn today.',
        template: template.slideStructure.contentSlide,
        style: template.colors,
        visual: 'Welcome graphic or agenda overview'
      })
    }

    // Content sections
    if (outline.sections && Array.isArray(outline.sections)) {
      outline.sections.forEach((section: any, index: number) => {
        // Section break slide for major sections
        if (index > 0 && section.duration > 5) {
          slides.push({
            type: 'section-break',
            title: section.title,
            duration: 1,
            notes: `Now let's move on to our next major topic: ${section.title}`,
            template: template.slideStructure.sectionBreak,
            style: template.colors
          })
        }

        // Main content slide
        slides.push({
          type: 'content',
          title: section.title,
          points: section.points || [
            'Key concept 1',
            'Key concept 2', 
            'Key concept 3',
            'Practical application'
          ],
          duration: Math.max(2, section.duration || 4),
          notes: section.notes || `In this section, we'll explore ${section.title} and how it applies to your situation.`,
          template: template.slideStructure.contentSlide,
          style: template.colors,
          visual: section.visual || 'Relevant diagram or illustration'
        })

        // Add example/case study slide for longer sections
        if (section.duration > 8) {
          slides.push({
            type: 'content',
            title: `${section.title}: Real Example`,
            points: [
              'Case study overview',
              'Key challenges faced',
              'Solution implemented',
              'Results achieved'
            ],
            duration: 3,
            notes: `Let me share a real-world example of ${section.title} in action.`,
            template: template.slideStructure.contentSlide,
            style: template.colors,
            visual: 'Case study graphic or before/after comparison'
          })
        }
      })
    }

    // Q&A slide
    slides.push({
      type: 'content',
      title: 'Questions & Discussion',
      points: [
        'What questions do you have?',
        'Share your experiences',
        'Let\'s discuss challenges',
        'How will you apply this?'
      ],
      duration: 5,
      notes: 'Now I\'d love to hear from you. What questions do you have about what we\'ve covered?',
      template: template.slideStructure.contentSlide,
      style: template.colors,
      visual: 'Q&A or discussion icon'
    })

    // Conclusion slide
    slides.push({
      type: 'conclusion',
      title: outline.conclusion?.title || 'Key Takeaways',
      points: outline.conclusion?.points || [
        'Main insight #1',
        'Main insight #2', 
        'Main insight #3',
        'Your next steps'
      ],
      duration: 3,
      notes: outline.conclusion?.notes || 'Let\'s wrap up with the key points you should remember and your next steps.',
      template: template.slideStructure.conclusionSlide,
      style: template.colors,
      cta: outline.conclusion?.cta || 'Get started today!'
    })

    // Thank you slide
    slides.push({
      type: 'conclusion',
      title: 'Thank You!',
      subtitle: 'Questions? Let\'s connect!',
      points: [
        'Contact information',
        'Additional resources',
        'Follow-up materials',
        'Next session preview'
      ],
      duration: 2,
      notes: 'Thank you for your attention and participation. Here\'s how you can reach me for follow-up questions.',
      template: template.slideStructure.conclusionSlide,
      style: template.colors,
      cta: 'Stay connected!'
    })

    return slides
  }

  async generateEnhancedSlides(): Promise<GeneratedSlide[]> {
    const baseSlides = this.generateSlides()
    
    // Enhance slides with visual content
    const enhancedSlides = await Promise.all(
      baseSlides.map(async (slide, index) => {
        const enhanced = { ...slide }
        
        // Add relevant images for most slides (except title slides)
        if (slide.type !== 'title') {
          try {
            enhanced.image = await this.generateSlideImage(slide)
          } catch (error) {
            console.warn(`Failed to generate image for slide ${index + 1}:`, error)
          }
        }
        
        // Add statistics for data-heavy topics
        if (this.shouldIncludeStats(slide)) {
          enhanced.statistics = await this.generateRelevantStats(slide)
          enhanced.type = 'stats'
        }
        
        // Add quotes for inspiration/authority
        if (this.shouldIncludeQuote(slide, index)) {
          enhanced.quote = await this.generateRelevantQuote(slide)
        }
        
        // Add charts for business/analytical topics
        if (this.shouldIncludeChart(slide)) {
          enhanced.chart = this.generateSampleChart(slide)
        }
        
        return enhanced
      })
    )
    
    return enhancedSlides
  }

  private async generateSlideImage(slide: GeneratedSlide): Promise<{ url: string; alt: string; caption?: string; source: 'unsplash' | 'generated' | 'user' } | undefined> {
    try {
      // Generate search query based on slide content
      const searchQuery = this.generateImageSearchQuery(slide)
      
      // Use the ImageService to get curated images
      const { ImageService } = await import('./imageService')
      const images = await ImageService.searchUnsplashImages(searchQuery, 1)
      
      if (images && images.length > 0) {
        const image = images[0]
        return {
          url: image.url,
          alt: image.alt,
          caption: `Visual representation of ${slide.title.toLowerCase()}`,
          source: 'unsplash'
        }
      }
      
      // Fallback to curated images if service fails
      const fallbackImages = this.getCuratedImagesByCategory(searchQuery)
      
      if (fallbackImages && fallbackImages.length > 0) {
        return {
          url: fallbackImages[0].url,
          alt: fallbackImages[0].alt,
          caption: fallbackImages[0].caption || `Visual representation of ${slide.title.toLowerCase()}`,
          source: 'unsplash'
        }
      }
      
      return undefined
    } catch (error) {
      console.warn('Failed to generate slide image, using fallback:', error)
      
      // Final fallback to ensure every slide gets an image
      const fallbackImages = this.getCuratedImagesByCategory(slide.title)
      if (fallbackImages && fallbackImages.length > 0) {
        return {
          url: fallbackImages[0].url,
          alt: fallbackImages[0].alt,
          caption: `Visual representation of ${slide.title.toLowerCase()}`,
          source: 'unsplash'
        }
      }
      
      return undefined
    }
  }

  private generateImageSearchQuery(slide: GeneratedSlide): string {
    const topic = this.options.topic.toLowerCase()
    const title = slide.title.toLowerCase()
    
    // Generate contextual search terms
    const businessTerms = ['business', 'professional', 'meeting', 'presentation']
    const techTerms = ['technology', 'digital', 'innovation', 'data']
    const marketingTerms = ['marketing', 'growth', 'strategy', 'success']
    
    if (businessTerms.some(term => topic.includes(term) || title.includes(term))) {
      return `business professional ${title.split(' ').slice(0, 2).join(' ')}`
    } else if (techTerms.some(term => topic.includes(term) || title.includes(term))) {
      return `technology innovation ${title.split(' ').slice(0, 2).join(' ')}`
    } else if (marketingTerms.some(term => topic.includes(term) || title.includes(term))) {
      return `marketing strategy ${title.split(' ').slice(0, 2).join(' ')}`
    }
    
    return `professional ${title.split(' ').slice(0, 3).join(' ')}`
  }

  private getCuratedImagesByCategory(query: string): Array<{ url: string; alt: string; caption?: string }> {
    const lowerQuery = query.toLowerCase()

    // Business & Professional
    if (lowerQuery.includes('business') || lowerQuery.includes('professional') || lowerQuery.includes('meeting')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
          alt: 'Professional business meeting',
          caption: 'Professional business environment'
        },
        {
          url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&crop=center',
          alt: 'Business team collaboration',
          caption: 'Team collaboration and strategy'
        }
      ]
    }

    // Technology & Innovation
    if (lowerQuery.includes('technology') || lowerQuery.includes('digital') || lowerQuery.includes('innovation') || lowerQuery.includes('ai')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop&crop=center',
          alt: 'Modern technology and innovation',
          caption: 'Technology and digital transformation'
        },
        {
          url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop&crop=center',
          alt: 'Digital transformation concept',
          caption: 'Digital innovation and progress'
        }
      ]
    }

    // Marketing & Growth
    if (lowerQuery.includes('marketing') || lowerQuery.includes('growth') || lowerQuery.includes('strategy') || lowerQuery.includes('success')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&crop=center',
          alt: 'Marketing strategy and analytics',
          caption: 'Strategic planning and growth'
        },
        {
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center',
          alt: 'Growth and success metrics',
          caption: 'Performance metrics and success'
        }
      ]
    }

    // Default professional images
    return [
      {
        url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
        alt: 'Professional presentation',
        caption: 'Professional business presentation'
      }
    ]
  }

  private shouldIncludeStats(slide: GeneratedSlide): boolean {
    const title = slide.title.toLowerCase()
    const topic = this.options.topic.toLowerCase()
    
    const statsKeywords = [
      'growth', 'increase', 'market', 'revenue', 'performance', 'results',
      'data', 'statistics', 'numbers', 'metrics', 'roi', 'conversion',
      'trends', 'analysis', 'research', 'study', 'survey'
    ]
    
    return statsKeywords.some(keyword => 
      title.includes(keyword) || topic.includes(keyword)
    )
  }

  private async generateRelevantStats(slide: GeneratedSlide): Promise<{ value: string; label: string; source?: string; trend?: 'up' | 'down' | 'stable' }[]> {
    // Generate contextual statistics based on slide content
    const topic = this.options.topic.toLowerCase()
    
    if (topic.includes('marketing') || topic.includes('digital')) {
      return [
        { value: '73%', label: 'of marketers believe content marketing increases leads', source: 'HubSpot 2024', trend: 'up' },
        { value: '4.2x', label: 'higher conversion rates with personalized content', source: 'Salesforce', trend: 'up' },
        { value: '$44', label: 'ROI for every $1 spent on email marketing', source: 'DMA', trend: 'stable' }
      ]
    } else if (topic.includes('business') || topic.includes('growth')) {
      return [
        { value: '67%', label: 'of businesses report increased productivity', source: 'McKinsey 2024', trend: 'up' },
        { value: '23%', label: 'average revenue growth with digital transformation', source: 'Deloitte', trend: 'up' },
        { value: '89%', label: 'of companies prioritize customer experience', source: 'PwC', trend: 'stable' }
      ]
    } else if (topic.includes('technology') || topic.includes('ai')) {
      return [
        { value: '85%', label: 'of organizations are adopting AI technologies', source: 'Gartner 2024', trend: 'up' },
        { value: '40%', label: 'productivity increase with automation', source: 'MIT Research', trend: 'up' },
        { value: '$13T', label: 'projected AI economic impact by 2030', source: 'McKinsey', trend: 'up' }
      ]
    }
    
    // Default generic business stats
    return [
      { value: '78%', label: 'of professionals use this strategy', source: 'Industry Report 2024', trend: 'up' },
      { value: '2.5x', label: 'improvement in key metrics', source: 'Research Study', trend: 'up' },
      { value: '92%', label: 'satisfaction rate among users', source: 'User Survey', trend: 'stable' }
    ]
  }

  private shouldIncludeQuote(slide: GeneratedSlide, index: number): boolean {
    // Add quotes to conclusion slides or every 4-5 slides for inspiration
    return slide.type === 'conclusion' || (index > 0 && index % 4 === 0)
  }

  private async generateRelevantQuote(slide: GeneratedSlide): Promise<{ text: string; author: string; role?: string }> {
    const topic = this.options.topic.toLowerCase()
    
    const businessQuotes = [
      { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", role: "Founder, Disney" },
      { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", role: "Co-founder, Apple" },
      { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates", role: "Co-founder, Microsoft" }
    ]
    
    const marketingQuotes = [
      { text: "Content is king, but marketing is queen, and runs the household.", author: "Gary Vaynerchuk", role: "CEO, VaynerMedia" },
      { text: "The best marketing doesn't feel like marketing.", author: "Tom Fishburne", role: "Founder, Marketoonist" },
      { text: "People don't buy what you do; they buy why you do it.", author: "Simon Sinek", role: "Author & Speaker" }
    ]
    
    const techQuotes = [
      { text: "The future belongs to organizations that can turn today's information into tomorrow's insight.", author: "Morris Chang", role: "Founder, TSMC" },
      { text: "Technology is best when it brings people together.", author: "Matt Mullenweg", role: "Co-founder, WordPress" },
      { text: "The advance of technology is based on making it fit in so that you don't really even notice it.", author: "Bill Gates", role: "Co-founder, Microsoft" }
    ]
    
    if (topic.includes('marketing')) {
      return marketingQuotes[Math.floor(Math.random() * marketingQuotes.length)]
    } else if (topic.includes('technology') || topic.includes('ai')) {
      return techQuotes[Math.floor(Math.random() * techQuotes.length)]
    }
    
    return businessQuotes[Math.floor(Math.random() * businessQuotes.length)]
  }

  private shouldIncludeChart(slide: GeneratedSlide): boolean {
    const title = slide.title.toLowerCase()
    const chartKeywords = ['comparison', 'growth', 'trends', 'analysis', 'data', 'results', 'performance']
    
    return chartKeywords.some(keyword => title.includes(keyword))
  }

  private generateSampleChart(slide: GeneratedSlide): { type: 'bar' | 'line' | 'pie' | 'donut'; data: any[]; title: string } {
    const topic = this.options.topic.toLowerCase()
    
    if (topic.includes('growth') || topic.includes('revenue')) {
      return {
        type: 'line',
        data: [
          { month: 'Jan', value: 65 },
          { month: 'Feb', value: 78 },
          { month: 'Mar', value: 82 },
          { month: 'Apr', value: 95 },
          { month: 'May', value: 108 },
          { month: 'Jun', value: 125 }
        ],
        title: 'Growth Trajectory Over Time'
      }
    } else if (topic.includes('market') || topic.includes('share')) {
      return {
        type: 'pie',
        data: [
          { label: 'Market Leader', value: 35 },
          { label: 'Competitor A', value: 25 },
          { label: 'Competitor B', value: 20 },
          { label: 'Others', value: 20 }
        ],
        title: 'Market Share Distribution'
      }
    }
    
    // Default comparison chart
    return {
      type: 'bar',
      data: [
        { category: 'Before', value: 45 },
        { category: 'After', value: 78 },
        { category: 'Projected', value: 95 }
      ],
      title: 'Performance Comparison'
    }
  }

  private applyCustomBranding(slide: any): any {
    if (!this.options.customBranding) return slide

    const { customBranding } = this.options
    const updatedStyle = { ...slide.style }

    if (customBranding.primaryColor) {
      updatedStyle.primary = customBranding.primaryColor
    }
    if (customBranding.secondaryColor) {
      updatedStyle.secondary = customBranding.secondaryColor
    }

    return {
      ...slide,
      style: updatedStyle,
      customBranding: this.options.customBranding
    }
  }

  generateSpeakerNotes(): string {
    const slides = this.generateSlides()
    
    return slides.map((slide, index) => {
      return `Slide ${index + 1}: ${slide.title}\n\nDuration: ${slide.duration} minutes\n\nSpeaker Notes:\n${slide.notes}\n\n${slide.points ? 'Key Points:\n• ' + slide.points.join('\n• ') : ''}\n\n${'='.repeat(50)}\n`
    }).join('')
  }

  generateSlideTimings(): Array<{ slideNumber: number; duration: number; cumulativeTime: number }> {
    const slides = this.generateSlides()
    let cumulativeTime = 0
    
    return slides.map((slide, index) => {
      const timing = {
        slideNumber: index + 1,
        duration: slide.duration,
        cumulativeTime
      }
      cumulativeTime += slide.duration
      return timing
    })
  }

  static getAvailableTemplates(): WebinarTemplate[] {
    try {
      return WEBINAR_TEMPLATES
    } catch (error) {
      console.error('Failed to load templates:', error)
      return []
    }
  }

  static validateOutline(outline: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!outline) {
      errors.push('Outline is required')
      return { isValid: false, errors }
    }
    
    if (!outline.title || outline.title.trim().length === 0) {
      errors.push('Outline must have a title')
    }
    
    if (!outline.sections || !Array.isArray(outline.sections) || outline.sections.length === 0) {
      errors.push('Outline must have at least one section')
    }
    
    if (outline.sections) {
      outline.sections.forEach((section: any, index: number) => {
        if (!section.title || section.title.trim().length === 0) {
          errors.push(`Section ${index + 1} must have a title`)
        }
        if (!section.duration || section.duration <= 0) {
          errors.push(`Section ${index + 1} must have a valid duration`)
        }
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  static estimateSlideCount(duration: number): number {
    // Rule of thumb: 1 slide per 1-2 minutes, with minimum 3 and maximum 25
    const slidesPerMinute = 0.6
    return Math.max(3, Math.min(25, Math.floor(duration * slidesPerMinute)))
  }

  static generateOptimalTiming(totalDuration: number, sectionCount: number): number[] {
    // Allocate time: 10% intro, 75% content, 10% Q&A, 5% conclusion
    const introTime = Math.max(2, totalDuration * 0.1)
    const contentTime = totalDuration * 0.75
    const qaTime = Math.max(3, totalDuration * 0.1)
    const conclusionTime = Math.max(2, totalDuration * 0.05)
    
    const sectionTime = contentTime / sectionCount
    
    return [
      introTime,
      ...Array(sectionCount).fill(sectionTime),
      qaTime,
      conclusionTime
    ]
  }
}