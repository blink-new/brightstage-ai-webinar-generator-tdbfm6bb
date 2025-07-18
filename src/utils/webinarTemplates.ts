export interface WebinarTemplate {
  id: string
  name: string
  description: string
  category: 'business' | 'education' | 'tech' | 'creative' | 'healthcare' | 'finance'
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  fonts: {
    heading: string
    body: string
  }
  layout: {
    titleSlide: 'centered' | 'left-aligned' | 'split'
    contentSlides: 'bullet-points' | 'visual-heavy' | 'minimal' | 'data-focused'
    spacing: 'tight' | 'normal' | 'spacious'
  }
  features: string[]
  preview: string
  slideStructure: {
    titleSlide: SlideTemplate
    contentSlide: SlideTemplate
    sectionBreak: SlideTemplate
    conclusionSlide: SlideTemplate
  }
}

export interface SlideTemplate {
  layout: string
  elements: SlideElement[]
}

export interface SlideElement {
  type: 'title' | 'subtitle' | 'text' | 'bullet-list' | 'image' | 'chart' | 'quote' | 'cta'
  position: { x: number; y: number; width: number; height: number }
  style: {
    fontSize?: string
    fontWeight?: string
    color?: string
    textAlign?: 'left' | 'center' | 'right'
    backgroundColor?: string
    borderRadius?: string
    padding?: string
  }
  animation?: {
    entrance: 'fade' | 'slide' | 'zoom' | 'none'
    duration: number
    delay: number
  }
}

export const WEBINAR_TEMPLATES: WebinarTemplate[] = [
  {
    id: 'modern-business',
    name: 'Modern Business',
    description: 'Clean, professional design perfect for corporate presentations and business webinars',
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
    features: [
      'Professional color scheme',
      'Clean typography',
      'Data visualization ready',
      'Mobile responsive',
      'Brand customizable'
    ],
    preview: '/templates/modern-business.png',
    slideStructure: {
      titleSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 30, width: 80, height: 20 },
            style: {
              fontSize: '48px',
              fontWeight: '700',
              color: '#1E40AF',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 800, delay: 0 }
          },
          {
            type: 'subtitle',
            position: { x: 15, y: 55, width: 70, height: 10 },
            style: {
              fontSize: '24px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 800, delay: 300 }
          }
        ]
      },
      contentSlide: {
        layout: 'split',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 10, width: 90, height: 15 },
            style: {
              fontSize: '36px',
              fontWeight: '600',
              color: '#1E40AF',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 600, delay: 0 }
          },
          {
            type: 'bullet-list',
            position: { x: 5, y: 30, width: 55, height: 60 },
            style: {
              fontSize: '20px',
              fontWeight: '400',
              color: '#1F2937',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 600, delay: 200 }
          },
          {
            type: 'image',
            position: { x: 65, y: 30, width: 30, height: 60 },
            style: {
              borderRadius: '8px'
            },
            animation: { entrance: 'zoom', duration: 600, delay: 400 }
          }
        ]
      },
      sectionBreak: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 40, width: 80, height: 20 },
            style: {
              fontSize: '42px',
              fontWeight: '700',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#1E40AF',
              borderRadius: '12px',
              padding: '20px'
            },
            animation: { entrance: 'zoom', duration: 800, delay: 0 }
          }
        ]
      },
      conclusionSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 25, width: 80, height: 15 },
            style: {
              fontSize: '40px',
              fontWeight: '700',
              color: '#1E40AF',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 800, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 15, y: 45, width: 70, height: 20 },
            style: {
              fontSize: '22px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 800, delay: 300 }
          },
          {
            type: 'cta',
            position: { x: 35, y: 70, width: 30, height: 10 },
            style: {
              fontSize: '18px',
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#F59E0B',
              borderRadius: '8px',
              padding: '12px 24px'
            },
            animation: { entrance: 'zoom', duration: 600, delay: 600 }
          }
        ]
      }
    }
  },
  {
    id: 'tech-gradient',
    name: 'Tech Gradient',
    description: 'Modern tech-focused design with gradients and dynamic elements for technology presentations',
    category: 'tech',
    colors: {
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      accent: '#8B5CF6',
      background: '#0F172A',
      text: '#F8FAFC'
    },
    fonts: {
      heading: 'Space Grotesk',
      body: 'Inter'
    },
    layout: {
      titleSlide: 'split',
      contentSlides: 'visual-heavy',
      spacing: 'spacious'
    },
    features: [
      'Dark theme optimized',
      'Gradient backgrounds',
      'Tech-focused icons',
      'Code-friendly fonts',
      'Animation-rich'
    ],
    preview: '/templates/tech-gradient.png',
    slideStructure: {
      titleSlide: {
        layout: 'split',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 20, width: 50, height: 25 },
            style: {
              fontSize: '52px',
              fontWeight: '800',
              color: '#0EA5E9',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 1000, delay: 0 }
          },
          {
            type: 'subtitle',
            position: { x: 5, y: 50, width: 50, height: 15 },
            style: {
              fontSize: '24px',
              fontWeight: '400',
              color: '#94A3B8',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 1000, delay: 300 }
          }
        ]
      },
      contentSlide: {
        layout: 'visual-heavy',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 5, width: 90, height: 15 },
            style: {
              fontSize: '38px',
              fontWeight: '700',
              color: '#0EA5E9',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 800, delay: 0 }
          },
          {
            type: 'image',
            position: { x: 5, y: 25, width: 40, height: 50 },
            style: {
              borderRadius: '12px'
            },
            animation: { entrance: 'zoom', duration: 800, delay: 200 }
          },
          {
            type: 'bullet-list',
            position: { x: 50, y: 25, width: 45, height: 50 },
            style: {
              fontSize: '18px',
              fontWeight: '400',
              color: '#F8FAFC',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 800, delay: 400 }
          }
        ]
      },
      sectionBreak: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 15, y: 35, width: 70, height: 30 },
            style: {
              fontSize: '48px',
              fontWeight: '800',
              color: '#F8FAFC',
              textAlign: 'center',
              backgroundColor: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)',
              borderRadius: '16px',
              padding: '30px'
            },
            animation: { entrance: 'zoom', duration: 1000, delay: 0 }
          }
        ]
      },
      conclusionSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 20, width: 80, height: 20 },
            style: {
              fontSize: '44px',
              fontWeight: '800',
              color: '#0EA5E9',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 15, y: 45, width: 70, height: 20 },
            style: {
              fontSize: '20px',
              fontWeight: '400',
              color: '#94A3B8',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 400 }
          },
          {
            type: 'cta',
            position: { x: 30, y: 70, width: 40, height: 12 },
            style: {
              fontSize: '20px',
              fontWeight: '700',
              color: '#F8FAFC',
              textAlign: 'center',
              backgroundColor: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
              borderRadius: '12px',
              padding: '16px 32px'
            },
            animation: { entrance: 'zoom', duration: 800, delay: 800 }
          }
        ]
      }
    }
  },
  {
    id: 'education-friendly',
    name: 'Education Friendly',
    description: 'Warm, approachable design perfect for educational content and training sessions',
    category: 'education',
    colors: {
      primary: '#059669',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFBEB',
      text: '#1F2937'
    },
    fonts: {
      heading: 'Poppins',
      body: 'Inter'
    },
    layout: {
      titleSlide: 'centered',
      contentSlides: 'bullet-points',
      spacing: 'normal'
    },
    features: [
      'Warm color palette',
      'Educational icons',
      'Clear hierarchy',
      'Student-friendly',
      'Interactive elements'
    ],
    preview: '/templates/education-friendly.png',
    slideStructure: {
      titleSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 25, width: 80, height: 25 },
            style: {
              fontSize: '46px',
              fontWeight: '700',
              color: '#059669',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'subtitle',
            position: { x: 15, y: 55, width: 70, height: 15 },
            style: {
              fontSize: '22px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 400 }
          }
        ]
      },
      contentSlide: {
        layout: 'bullet-points',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 8, width: 90, height: 18 },
            style: {
              fontSize: '34px',
              fontWeight: '600',
              color: '#059669',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 800, delay: 0 }
          },
          {
            type: 'bullet-list',
            position: { x: 5, y: 30, width: 90, height: 60 },
            style: {
              fontSize: '20px',
              fontWeight: '400',
              color: '#1F2937',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 800, delay: 300 }
          }
        ]
      },
      sectionBreak: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 35, width: 80, height: 30 },
            style: {
              fontSize: '40px',
              fontWeight: '700',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#059669',
              borderRadius: '20px',
              padding: '25px'
            },
            animation: { entrance: 'zoom', duration: 1000, delay: 0 }
          }
        ]
      },
      conclusionSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 20, width: 80, height: 20 },
            style: {
              fontSize: '42px',
              fontWeight: '700',
              color: '#059669',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 15, y: 45, width: 70, height: 25 },
            style: {
              fontSize: '20px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 400 }
          },
          {
            type: 'cta',
            position: { x: 35, y: 75, width: 30, height: 10 },
            style: {
              fontSize: '18px',
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#F59E0B',
              borderRadius: '10px',
              padding: '14px 28px'
            },
            animation: { entrance: 'zoom', duration: 800, delay: 800 }
          }
        ]
      }
    }
  },
  {
    id: 'creative-bold',
    name: 'Creative Bold',
    description: 'Vibrant and engaging design for creative presentations and marketing webinars',
    category: 'creative',
    colors: {
      primary: '#EC4899',
      secondary: '#8B5CF6',
      accent: '#F59E0B',
      background: '#FEFCE8',
      text: '#1F2937'
    },
    fonts: {
      heading: 'Bricolage Grotesque',
      body: 'Inter'
    },
    layout: {
      titleSlide: 'left-aligned',
      contentSlides: 'visual-heavy',
      spacing: 'spacious'
    },
    features: [
      'Bold color combinations',
      'Creative typography',
      'Visual storytelling',
      'Brand-focused',
      'Engaging animations'
    ],
    preview: '/templates/creative-bold.png',
    slideStructure: {
      titleSlide: {
        layout: 'left-aligned',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 15, width: 60, height: 30 },
            style: {
              fontSize: '56px',
              fontWeight: '800',
              color: '#EC4899',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 1200, delay: 0 }
          },
          {
            type: 'subtitle',
            position: { x: 5, y: 50, width: 50, height: 20 },
            style: {
              fontSize: '26px',
              fontWeight: '500',
              color: '#8B5CF6',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 1200, delay: 400 }
          }
        ]
      },
      contentSlide: {
        layout: 'visual-heavy',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 5, width: 90, height: 18 },
            style: {
              fontSize: '40px',
              fontWeight: '700',
              color: '#EC4899',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'image',
            position: { x: 55, y: 25, width: 40, height: 50 },
            style: {
              borderRadius: '16px'
            },
            animation: { entrance: 'zoom', duration: 1000, delay: 200 }
          },
          {
            type: 'bullet-list',
            position: { x: 5, y: 25, width: 45, height: 50 },
            style: {
              fontSize: '19px',
              fontWeight: '400',
              color: '#1F2937',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 1000, delay: 400 }
          }
        ]
      },
      sectionBreak: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 30, width: 80, height: 40 },
            style: {
              fontSize: '50px',
              fontWeight: '800',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
              borderRadius: '24px',
              padding: '35px'
            },
            animation: { entrance: 'zoom', duration: 1200, delay: 0 }
          }
        ]
      },
      conclusionSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 15, width: 80, height: 25 },
            style: {
              fontSize: '48px',
              fontWeight: '800',
              color: '#EC4899',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1200, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 15, y: 45, width: 70, height: 25 },
            style: {
              fontSize: '22px',
              fontWeight: '500',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1200, delay: 400 }
          },
          {
            type: 'cta',
            position: { x: 25, y: 75, width: 50, height: 12 },
            style: {
              fontSize: '22px',
              fontWeight: '700',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#F59E0B',
              borderRadius: '16px',
              padding: '18px 36px'
            },
            animation: { entrance: 'zoom', duration: 1000, delay: 800 }
          }
        ]
      }
    }
  },
  {
    id: 'minimal-elegant',
    name: 'Minimal Elegant',
    description: 'Clean, sophisticated design with lots of white space for premium presentations',
    category: 'business',
    colors: {
      primary: '#000000',
      secondary: '#6B7280',
      accent: '#3B82F6',
      background: '#FFFFFF',
      text: '#1F2937'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    layout: {
      titleSlide: 'centered',
      contentSlides: 'minimal',
      spacing: 'spacious'
    },
    features: [
      'Ultra-clean design',
      'Premium typography',
      'Lots of white space',
      'Sophisticated look',
      'Focus on content'
    ],
    preview: '/templates/minimal-elegant.png',
    slideStructure: {
      titleSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 15, y: 35, width: 70, height: 20 },
            style: {
              fontSize: '44px',
              fontWeight: '300',
              color: '#000000',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1500, delay: 0 }
          },
          {
            type: 'subtitle',
            position: { x: 20, y: 60, width: 60, height: 10 },
            style: {
              fontSize: '18px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1500, delay: 600 }
          }
        ]
      },
      contentSlide: {
        layout: 'minimal',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 15, width: 80, height: 15 },
            style: {
              fontSize: '32px',
              fontWeight: '300',
              color: '#000000',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 10, y: 35, width: 80, height: 50 },
            style: {
              fontSize: '18px',
              fontWeight: '400',
              color: '#1F2937',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 400 }
          }
        ]
      },
      sectionBreak: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 20, y: 40, width: 60, height: 20 },
            style: {
              fontSize: '36px',
              fontWeight: '300',
              color: '#000000',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1500, delay: 0 }
          }
        ]
      },
      conclusionSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 15, y: 30, width: 70, height: 20 },
            style: {
              fontSize: '38px',
              fontWeight: '300',
              color: '#000000',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1500, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 20, y: 55, width: 60, height: 20 },
            style: {
              fontSize: '16px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1500, delay: 600 }
          },
          {
            type: 'cta',
            position: { x: 40, y: 80, width: 20, height: 8 },
            style: {
              fontSize: '16px',
              fontWeight: '500',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#3B82F6',
              borderRadius: '4px',
              padding: '12px 24px'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 1200 }
          }
        ]
      }
    }
  },
  {
    id: 'data-focused',
    name: 'Data Focused',
    description: 'Professional design optimized for data presentations and analytics webinars',
    category: 'business',
    colors: {
      primary: '#1F2937',
      secondary: '#3B82F6',
      accent: '#10B981',
      background: '#F9FAFB',
      text: '#111827'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    layout: {
      titleSlide: 'centered',
      contentSlides: 'data-focused',
      spacing: 'normal'
    },
    features: [
      'Chart-optimized',
      'Data visualization',
      'Professional colors',
      'Clear hierarchy',
      'Analytics-friendly'
    ],
    preview: '/templates/data-focused.png',
    slideStructure: {
      titleSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 30, width: 80, height: 20 },
            style: {
              fontSize: '42px',
              fontWeight: '600',
              color: '#1F2937',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'subtitle',
            position: { x: 15, y: 55, width: 70, height: 15 },
            style: {
              fontSize: '20px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 400 }
          }
        ]
      },
      contentSlide: {
        layout: 'data-focused',
        elements: [
          {
            type: 'title',
            position: { x: 5, y: 8, width: 90, height: 12 },
            style: {
              fontSize: '30px',
              fontWeight: '600',
              color: '#1F2937',
              textAlign: 'left'
            },
            animation: { entrance: 'slide', duration: 800, delay: 0 }
          },
          {
            type: 'chart',
            position: { x: 5, y: 25, width: 55, height: 60 },
            style: {
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px'
            },
            animation: { entrance: 'zoom', duration: 1000, delay: 300 }
          },
          {
            type: 'bullet-list',
            position: { x: 65, y: 25, width: 30, height: 60 },
            style: {
              fontSize: '16px',
              fontWeight: '400',
              color: '#111827',
              textAlign: 'left'
            },
            animation: { entrance: 'fade', duration: 800, delay: 600 }
          }
        ]
      },
      sectionBreak: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 15, y: 40, width: 70, height: 20 },
            style: {
              fontSize: '36px',
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#1F2937',
              borderRadius: '8px',
              padding: '20px'
            },
            animation: { entrance: 'zoom', duration: 1000, delay: 0 }
          }
        ]
      },
      conclusionSlide: {
        layout: 'centered',
        elements: [
          {
            type: 'title',
            position: { x: 10, y: 25, width: 80, height: 20 },
            style: {
              fontSize: '38px',
              fontWeight: '600',
              color: '#1F2937',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 0 }
          },
          {
            type: 'text',
            position: { x: 15, y: 50, width: 70, height: 20 },
            style: {
              fontSize: '18px',
              fontWeight: '400',
              color: '#6B7280',
              textAlign: 'center'
            },
            animation: { entrance: 'fade', duration: 1000, delay: 400 }
          },
          {
            type: 'cta',
            position: { x: 35, y: 75, width: 30, height: 10 },
            style: {
              fontSize: '16px',
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
              backgroundColor: '#10B981',
              borderRadius: '6px',
              padding: '12px 24px'
            },
            animation: { entrance: 'zoom', duration: 800, delay: 800 }
          }
        ]
      }
    }
  }
]

export function getTemplateById(id: string): WebinarTemplate | undefined {
  return WEBINAR_TEMPLATES.find(template => template.id === id)
}

export function getTemplatesByCategory(category: WebinarTemplate['category']): WebinarTemplate[] {
  return WEBINAR_TEMPLATES.filter(template => template.category === category)
}