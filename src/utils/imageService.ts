import { blink } from '../blink/client'

export interface UnsplashImage {
  url: string
  alt: string
  caption?: string
  source: 'unsplash'
  photographer?: string
  photographerUrl?: string
}

export class ImageService {
  static async searchUnsplashImages(query: string, count: number = 1): Promise<UnsplashImage[]> {
    // For now, directly use fallback images to avoid API dependency issues
    // TODO: Add Unsplash API integration when secrets are properly configured
    console.log(`Using curated images for query: ${query}`)
    
    // Use curated professional images
    return this.getFallbackImages(query, count)
  }

  private static getFallbackImages(query: string, count: number): UnsplashImage[] {
    const fallbackImages = this.getCuratedImagesByCategory(query)
    return fallbackImages.slice(0, count)
  }

  private static getCuratedImagesByCategory(query: string): UnsplashImage[] {
    const lowerQuery = query.toLowerCase()

    // Business & Professional
    if (lowerQuery.includes('business') || lowerQuery.includes('professional') || lowerQuery.includes('meeting')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
          alt: 'Professional business meeting',
          source: 'unsplash',
          photographer: 'Campaign Creators'
        },
        {
          url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&crop=center',
          alt: 'Business team collaboration',
          source: 'unsplash',
          photographer: 'Annie Spratt'
        },
        {
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=center',
          alt: 'Professional workspace',
          source: 'unsplash',
          photographer: 'Ben Rosett'
        }
      ]
    }

    // Technology & Innovation
    if (lowerQuery.includes('technology') || lowerQuery.includes('digital') || lowerQuery.includes('innovation') || lowerQuery.includes('ai')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop&crop=center',
          alt: 'Modern technology and innovation',
          source: 'unsplash',
          photographer: 'Adi Goldstein'
        },
        {
          url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop&crop=center',
          alt: 'Digital transformation concept',
          source: 'unsplash',
          photographer: 'ThisisEngineering RAEng'
        },
        {
          url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop&crop=center',
          alt: 'Technology and data visualization',
          source: 'unsplash',
          photographer: 'Scott Graham'
        }
      ]
    }

    // Marketing & Growth
    if (lowerQuery.includes('marketing') || lowerQuery.includes('growth') || lowerQuery.includes('strategy') || lowerQuery.includes('success')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&crop=center',
          alt: 'Marketing strategy and analytics',
          source: 'unsplash',
          photographer: 'Carlos Muza'
        },
        {
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center',
          alt: 'Growth and success metrics',
          source: 'unsplash',
          photographer: 'Isaac Smith'
        },
        {
          url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=600&fit=crop&crop=center',
          alt: 'Strategic planning and growth',
          source: 'unsplash',
          photographer: 'Austin Distel'
        }
      ]
    }

    // Data & Analytics
    if (lowerQuery.includes('data') || lowerQuery.includes('analytics') || lowerQuery.includes('chart') || lowerQuery.includes('statistics')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center',
          alt: 'Data analytics and insights',
          source: 'unsplash',
          photographer: 'Isaac Smith'
        },
        {
          url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800&h=600&fit=crop&crop=center',
          alt: 'Statistical analysis and reporting',
          source: 'unsplash',
          photographer: 'Lukas Blazek'
        },
        {
          url: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=600&fit=crop&crop=center',
          alt: 'Data visualization and charts',
          source: 'unsplash',
          photographer: 'Markus Spiske'
        }
      ]
    }

    // Finance & Investment
    if (lowerQuery.includes('finance') || lowerQuery.includes('investment') || lowerQuery.includes('money') || lowerQuery.includes('revenue')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop&crop=center',
          alt: 'Financial growth and investment',
          source: 'unsplash',
          photographer: 'Micheile Henderson'
        },
        {
          url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&crop=center',
          alt: 'Financial planning and analysis',
          source: 'unsplash',
          photographer: 'Towfiqu barbhuiya'
        }
      ]
    }

    // Education & Learning
    if (lowerQuery.includes('education') || lowerQuery.includes('learning') || lowerQuery.includes('training') || lowerQuery.includes('development')) {
      return [
        {
          url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&crop=center',
          alt: 'Learning and professional development',
          source: 'unsplash',
          photographer: 'Annie Spratt'
        },
        {
          url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop&crop=center',
          alt: 'Education and knowledge sharing',
          source: 'unsplash',
          photographer: 'Tra Nguyen'
        }
      ]
    }

    // Default professional images
    return [
      {
        url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
        alt: 'Professional presentation',
        source: 'unsplash',
        photographer: 'Campaign Creators'
      },
      {
        url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&crop=center',
        alt: 'Business collaboration',
        source: 'unsplash',
        photographer: 'Annie Spratt'
      }
    ]
  }

  static async generateAIImage(prompt: string): Promise<UnsplashImage> {
    try {
      if (!blink) {
        throw new Error('Blink client not available')
      }
      
      const result = await blink.ai.generateImage({
        prompt: `Professional, high-quality image for business presentation: ${prompt}. Clean, modern style suitable for corporate webinar.`,
        size: '1024x1024',
        quality: 'high',
        style: 'natural'
      })

      if (result.data && result.data[0]) {
        return {
          url: result.data[0].url,
          alt: `AI-generated image: ${prompt}`,
          caption: `Custom generated visual for ${prompt}`,
          source: 'unsplash' // Using unsplash type for consistency
        }
      }
    } catch (error) {
      console.warn('AI image generation failed, using fallback:', error)
    }

    // Fallback to curated image
    const fallbackImages = this.getFallbackImages(prompt, 1)
    return fallbackImages[0] || {
      url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center',
      alt: 'Professional presentation',
      source: 'unsplash',
      photographer: 'Campaign Creators'
    }
  }
}