export interface UnsplashImage {
  id: string
  url: string
  alt: string
  caption?: string
  photographer: string
  source: 'unsplash'
}

export class ImageService {
  static async searchUnsplashImages(query: string, count: number = 1): Promise<UnsplashImage[]> {
    try {
      // Try to use Blink's search functionality first
      const { blink } = await import('../blink/client')
      
      if (blink && blink.data && blink.data.search) {
        console.log(`Searching for images with query: "${query}"`)
        
        const searchResults = await blink.data.search(query, {
          type: 'images',
          limit: Math.min(count, 10)
        })
        
        if (searchResults && searchResults.image_results && searchResults.image_results.length > 0) {
          console.log(`Found ${searchResults.image_results.length} images from search`)
          
          return searchResults.image_results.slice(0, count).map((img: any, index: number) => ({
            id: `search-${index}-${Date.now()}`,
            url: img.original || img.thumbnail || img.url,
            alt: img.title || img.alt || `Image for ${query}`,
            caption: img.title || `Professional image for ${query}`,
            photographer: img.source || 'Web Search',
            source: 'unsplash' as const
          }))
        }
      }
      
      // Fallback to AI image generation if search doesn't work
      if (blink && blink.ai && blink.ai.generateImage) {
        console.log(`Generating AI image for query: "${query}"`)
        
        const imagePrompt = this.createImagePrompt(query)
        const result = await blink.ai.generateImage({
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'high',
          n: Math.min(count, 4)
        })
        
        if (result && result.data && result.data.length > 0) {
          console.log(`Generated ${result.data.length} AI images`)
          
          return result.data.slice(0, count).map((img: any, index: number) => ({
            id: `ai-${index}-${Date.now()}`,
            url: img.url,
            alt: `AI generated image for ${query}`,
            caption: `Professional AI-generated visual for ${query}`,
            photographer: 'AI Generated',
            source: 'unsplash' as const
          }))
        }
      }
      
      // Final fallback to curated images
      console.log(`Using curated fallback images for query: "${query}"`)
      return this.getCuratedImages(query, count)
    } catch (error) {
      console.warn('Image search/generation failed, using fallback images:', error)
      return this.getCuratedImages(query, count)
    }
  }

  private static createImagePrompt(query: string): string {
    const cleanQuery = query.toLowerCase()
    
    // Create professional, business-appropriate image prompts
    if (cleanQuery.includes('business') || cleanQuery.includes('professional')) {
      return `Professional business setting, ${query}, modern office environment, clean and corporate style, high quality photography`
    } else if (cleanQuery.includes('technology') || cleanQuery.includes('digital') || cleanQuery.includes('ai')) {
      return `Modern technology concept, ${query}, futuristic and clean design, professional tech environment, high quality digital art`
    } else if (cleanQuery.includes('marketing') || cleanQuery.includes('growth') || cleanQuery.includes('strategy')) {
      return `Marketing and business growth concept, ${query}, professional charts and analytics, modern business style, high quality illustration`
    } else if (cleanQuery.includes('education') || cleanQuery.includes('learning') || cleanQuery.includes('training')) {
      return `Educational and learning environment, ${query}, professional training setting, modern classroom or workshop, high quality photography`
    }
    
    return `Professional presentation visual for ${query}, clean and modern style, business appropriate, high quality photography or illustration`
  }

  private static getCuratedImages(query: string, count: number): UnsplashImage[] {
    const lowerQuery = query.toLowerCase()
    
    // Business & Professional
    if (lowerQuery.includes('business') || lowerQuery.includes('professional') || lowerQuery.includes('meeting')) {
      return this.getBusinessImages().slice(0, count)
    }
    
    // Technology & Innovation
    if (lowerQuery.includes('technology') || lowerQuery.includes('digital') || lowerQuery.includes('innovation') || lowerQuery.includes('ai')) {
      return this.getTechImages().slice(0, count)
    }
    
    // Marketing & Growth
    if (lowerQuery.includes('marketing') || lowerQuery.includes('growth') || lowerQuery.includes('strategy')) {
      return this.getMarketingImages().slice(0, count)
    }
    
    // Default professional images
    return this.getDefaultImages().slice(0, count)
  }

  private static getBusinessImages(): UnsplashImage[] {
    return [
      {
        id: 'business-1',
        url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
        alt: 'Professional business meeting',
        caption: 'Professional business environment',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'business-2',
        url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&crop=center',
        alt: 'Business team collaboration',
        caption: 'Team collaboration and strategy',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'business-3',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=center',
        alt: 'Business presentation',
        caption: 'Professional presentation setting',
        photographer: 'Unsplash',
        source: 'unsplash'
      }
    ]
  }

  private static getTechImages(): UnsplashImage[] {
    return [
      {
        id: 'tech-1',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop&crop=center',
        alt: 'Modern technology and innovation',
        caption: 'Technology and digital transformation',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'tech-2',
        url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop&crop=center',
        alt: 'Digital transformation concept',
        caption: 'Digital innovation and progress',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'tech-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop&crop=center',
        alt: 'Technology workspace',
        caption: 'Modern tech environment',
        photographer: 'Unsplash',
        source: 'unsplash'
      }
    ]
  }

  private static getMarketingImages(): UnsplashImage[] {
    return [
      {
        id: 'marketing-1',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&crop=center',
        alt: 'Marketing strategy and analytics',
        caption: 'Strategic planning and growth',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'marketing-2',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center',
        alt: 'Growth and success metrics',
        caption: 'Performance metrics and success',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'marketing-3',
        url: 'https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&h=600&fit=crop&crop=center',
        alt: 'Marketing campaign planning',
        caption: 'Creative marketing strategy',
        photographer: 'Unsplash',
        source: 'unsplash'
      }
    ]
  }

  private static getDefaultImages(): UnsplashImage[] {
    return [
      {
        id: 'default-1',
        url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
        alt: 'Professional presentation',
        caption: 'Professional business presentation',
        photographer: 'Unsplash',
        source: 'unsplash'
      },
      {
        id: 'default-2',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=center',
        alt: 'Professional workspace',
        caption: 'Modern professional environment',
        photographer: 'Unsplash',
        source: 'unsplash'
      }
    ]
  }
}