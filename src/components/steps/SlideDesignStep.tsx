import { useState, useRef } from 'react'
import { Palette, Eye, Download, Upload, Loader2, ArrowLeft, ArrowRight, Edit3, Save, X, Sparkles, Clock, Users, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import type { WebinarData } from '../../types/webinar'
import { blink } from '../../blink/client'
import { useToast } from '../../hooks/use-toast'
import { SlideGenerator } from '../../utils/slideGenerator'
import { PPTXGenerator } from '../../utils/pptxGenerator'

interface SlideDesignStepProps {
  data: WebinarData
  onUpdate: (updates: Partial<WebinarData>) => void
  onNext: () => void
  onPrev: () => void
}

import { WEBINAR_TEMPLATES } from '../../utils/webinarTemplates'

const templates = WEBINAR_TEMPLATES

export function SlideDesignStep({ data, onUpdate, onNext, onPrev }: SlideDesignStepProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(data.template || 'modern-business')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isEditingOutline, setIsEditingOutline] = useState(false)
  const [editedOutline, setEditedOutline] = useState(data.outline)
  const [isExporting, setIsExporting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    onUpdate({ template: templateId })
  }

  const handleGenerateSlides = async () => {
    if (!data.outline) {
      toast({
        title: 'No content available',
        description: 'Please complete the content generation step first.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    try {
      // Handle legacy outline format with raw text
      let processedOutline = data.outline
      if (data.outline.raw && !data.outline.title && !data.outline.sections) {
        // Convert legacy raw format to proper outline structure
        processedOutline = {
          title: data.topic || 'Webinar Presentation',
          introduction: {
            hook: 'Welcome to this engaging webinar presentation',
            duration: Math.floor(data.duration * 0.1),
            points: ['Welcome and introductions', 'Overview of what we\'ll cover']
          },
          sections: [
            {
              title: 'Main Content Section',
              duration: Math.floor(data.duration * 0.7),
              points: [
                'Key concept 1',
                'Key concept 2', 
                'Key concept 3',
                'Practical examples'
              ],
              transition: 'Now let\'s move on to our next topic'
            }
          ],
          conclusion: {
            summary: 'Key takeaways from today\'s presentation',
            cta: 'Thank you for attending - please reach out with questions',
            duration: Math.floor(data.duration * 0.2),
            points: ['Recap main points', 'Next steps', 'Q&A session']
          }
        }
        // Update the data with the processed outline
        onUpdate({ outline: processedOutline })
      }

      // Validate outline first
      const validation = SlideGenerator.validateOutline(processedOutline)
      if (!validation.isValid) {
        toast({
          title: 'Invalid outline',
          description: validation.errors.join(', '),
          variant: 'destructive'
        })
        setIsGenerating(false)
        return
      }

      // Use the enhanced SlideGenerator with visual elements
      const slideGenerator = new SlideGenerator({
        templateId: selectedTemplate,
        outline: processedOutline,
        duration: data.duration,
        audience: data.audience,
        topic: data.topic
      })

      // Generate enhanced slides with images, stats, quotes, and charts
      const generatedSlides = await slideGenerator.generateEnhancedSlides()
      const speakerNotes = slideGenerator.generateSpeakerNotes()
      const slideTimings = slideGenerator.generateSlideTimings()

      // Further enhance slides with AI-generated content for better quality
      const enhancedSlides = await Promise.all(
        generatedSlides.map(async (slide, index) => {
          if (slide.type === 'content' && slide.points) {
            try {
              if (!blink) {
                return slide // Keep original if AI call fails
              }
              const { text } = await blink.ai.generateText({
                prompt: `Enhance these slide points for a professional webinar:
                
                Topic: ${data.topic}
                Audience: ${data.audience}
                Slide Title: ${slide.title}
                Current Points: ${slide.points.join(', ')}
                
                Make them more engaging, specific, and actionable. Return as JSON array of strings.
                Maximum 4-5 points per slide. Keep each point concise but impactful.`,
                model: 'gpt-4o-mini'
              })
              
              try {
                const enhancedPoints = JSON.parse(text)
                return { ...slide, points: enhancedPoints }
              } catch {
                return slide // Keep original if parsing fails
              }
            } catch {
              return slide // Keep original if AI call fails
            }
          }
          return slide
        })
      )

      onUpdate({ 
        slides: enhancedSlides, 
        template: selectedTemplate,
        speakerNotes,
        slideTimings
      })
      
      // Count visual enhancements
      const imageCount = enhancedSlides.filter(slide => slide.image).length
      const statsCount = enhancedSlides.filter(slide => slide.statistics).length
      const quoteCount = enhancedSlides.filter(slide => slide.quote).length
      const chartCount = enhancedSlides.filter(slide => slide.chart).length

      const visualFeatures = []
      if (imageCount > 0) visualFeatures.push(`${imageCount} professional images`)
      if (statsCount > 0) visualFeatures.push(`${statsCount} data slides`)
      if (quoteCount > 0) visualFeatures.push(`${quoteCount} inspiring quotes`)
      if (chartCount > 0) visualFeatures.push(`${chartCount} charts`)

      toast({
        title: 'Professional webinar slides generated!',
        description: `Created ${enhancedSlides.length} slides with ${selectedTemplate.replace('-', ' ')} template${visualFeatures.length > 0 ? ` including ${visualFeatures.join(', ')}` : ''}.`,
        duration: 5000
      })
    } catch (error) {
      console.error('Slide generation error:', error)
      toast({
        title: 'Generation failed',
        description: 'Please try again or select a different template.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveOutline = () => {
    onUpdate({ outline: editedOutline })
    setIsEditingOutline(false)
    toast({
      title: 'Outline updated',
      description: 'Your content outline has been saved successfully.'
    })
  }

  const handleCancelEdit = () => {
    setEditedOutline(data.outline)
    setIsEditingOutline(false)
  }

  const handleExportPPTX = async () => {
    if (!data.slides || data.slides.length === 0) {
      toast({
        title: 'No slides available',
        description: 'Please generate slides first before exporting.',
        variant: 'destructive'
      })
      return
    }

    setIsExporting(true)
    try {
      console.log('Exporting PPTX from SlideDesignStep with data:', {
        title: data.topic,
        slideCount: data.slides.length,
        template: data.template
      })
      
      // Convert WebinarData to the format expected by PPTXGenerator
      const pptxData = {
        title: data.topic || 'Untitled Webinar',
        slides: data.slides.map((slide: any, index: number) => ({
          id: slide.id || `slide-${index + 1}`,
          title: slide.title || `Slide ${index + 1}`,
          content: Array.isArray(slide.points) ? slide.points : 
                  Array.isArray(slide.content) ? slide.content : 
                  [slide.content || slide.subtitle || ''],
          notes: slide.notes || `Speaker notes for ${slide.title}`,
          imageUrl: slide.image?.url || slide.imageUrl,
          chartData: slide.chart || slide.chartData,
          type: (index === 0 ? 'title' : 
                 index === (data.slides.length - 1) ? 'conclusion' : 
                 slide.image?.url || slide.imageUrl ? 'image' : 
                 slide.chart || slide.chartData ? 'chart' : 'content') as 'title' | 'content' | 'image' | 'chart' | 'conclusion'
        })),
        template: data.template || 'modern-business',
        duration: data.duration || 30,
        audience: data.audience || 'General'
      }
      
      console.log('Converted PPTX data:', {
        title: pptxData.title,
        slideCount: pptxData.slides.length,
        template: pptxData.template,
        firstSlide: pptxData.slides[0]
      })
      
      const generator = new PPTXGenerator()
      const result = await generator.generatePPTX(pptxData)
      
      console.log('PPTX generation result:', result)
      
      if (result.success && result.blob) {
        console.log('Blob details:', {
          size: result.blob.size,
          type: result.blob.type,
          isBlob: result.blob instanceof Blob
        })
        
        PPTXGenerator.downloadPPTX(result.blob, result.filename)
        toast({
          title: 'PPTX exported successfully!',
          description: `Downloaded ${result.slideCount} slides (${Math.round(result.blob.size / 1024)}KB)`
        })
      } else {
        throw new Error(result.error || 'Failed to generate PPTX')
      }
    } catch (error) {
      console.error('PPTX export error:', error)
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to export PowerPoint. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleUploadPPTX = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PowerPoint (.pptx) file.',
        variant: 'destructive'
      })
      return
    }

    // For now, show that this feature is coming soon
    toast({
      title: 'Feature coming soon',
      description: 'PPTX upload and parsing will be available in a future update.',
      variant: 'default'
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const slides = data.slides || []
  const hasSlides = slides.length > 0

  return (
    <div className="space-y-8">
      {/* Content Outline Preview/Editor */}
      {data.outline && (
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Generated Content Outline</CardTitle>
                <CardDescription>
                  Based on your inputs from Step 1 - You can edit this outline and regenerate slides
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {isEditingOutline ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveOutline}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingOutline(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Outline
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Clear slides to force regeneration
                        onUpdate({ slides: undefined })
                        toast({
                          title: 'Ready to regenerate',
                          description: 'Click "Generate Slides" to create new slides with your current outline.'
                        })
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Regenerate Slides
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingOutline ? (
              <div className="space-y-4">
                {editedOutline?.title && (
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={editedOutline.title}
                      onChange={(e) => setEditedOutline({
                        ...editedOutline,
                        title: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                )}
                
                {editedOutline?.introduction && (
                  <div>
                    <label className="text-sm font-medium">Introduction Hook</label>
                    <Textarea
                      value={editedOutline.introduction.hook}
                      onChange={(e) => setEditedOutline({
                        ...editedOutline,
                        introduction: {
                          ...editedOutline.introduction,
                          hook: e.target.value
                        }
                      })}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                )}

                {editedOutline?.sections && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Content Sections</label>
                    {editedOutline.sections.map((section: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <Input
                          value={section.title}
                          onChange={(e) => {
                            const newSections = [...editedOutline.sections]
                            newSections[index] = { ...section, title: e.target.value }
                            setEditedOutline({
                              ...editedOutline,
                              sections: newSections
                            })
                          }}
                          placeholder="Section title"
                        />
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            value={section.duration}
                            onChange={(e) => {
                              const newSections = [...editedOutline.sections]
                              newSections[index] = { ...section, duration: parseInt(e.target.value) }
                              setEditedOutline({
                                ...editedOutline,
                                sections: newSections
                              })
                            }}
                            placeholder="Duration (min)"
                            className="w-32"
                          />
                        </div>
                        {section.points && (
                          <Textarea
                            value={section.points.join('\n')}
                            onChange={(e) => {
                              const newSections = [...editedOutline.sections]
                              newSections[index] = { 
                                ...section, 
                                points: e.target.value.split('\n').filter(p => p.trim())
                              }
                              setEditedOutline({
                                ...editedOutline,
                                sections: newSections
                              })
                            }}
                            placeholder="Key points (one per line)"
                            rows={3}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {data.outline.title && (
                  <div className="font-medium text-primary">{data.outline.title}</div>
                )}
                {data.outline.sections && data.outline.sections.map((section: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Badge variant="outline">{section.duration}min</Badge>
                    <span>{section.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Selection */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Choose Professional Template</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {SlideGenerator.estimateSlideCount(data.duration)} slides estimated
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                selectedTemplate === template.id
                  ? 'ring-2 ring-primary bg-primary/5 shadow-lg'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardContent className="p-5">
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})` 
                    }}
                  />
                  <Eye className="h-8 w-8 text-muted-foreground relative z-10" />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-xs"
                  >
                    {template.category}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base">{template.name}</h4>
                    {selectedTemplate === template.id && (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1">
                      {Object.values(template.colors).slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{template.layout.contentSlides}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Template Info */}
        {selectedTemplate && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary mb-1">
                    {templates.find(t => t.id === selectedTemplate)?.name} Template Selected
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    This template is optimized for {templates.find(t => t.id === selectedTemplate)?.category} presentations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {templates.find(t => t.id === selectedTemplate)?.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Slides Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateSlides}
          disabled={isGenerating || !data.outline}
          size="lg"
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Slides...
            </>
          ) : (
            <>
              <Palette className="h-4 w-4 mr-2" />
              Generate Slides
            </>
          )}
        </Button>
      </div>

      {/* Slide Preview */}
      {hasSlides && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Slide Preview</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentSlide + 1} of {slides.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {slides[currentSlide] && (
                <div className="relative">
                  {/* Slide Preview with Template Styling */}
                  <div 
                    className="aspect-video p-8 flex flex-col justify-center relative"
                    style={{ 
                      backgroundColor: slides[currentSlide].style?.background || '#FFFFFF',
                      backgroundImage: slides[currentSlide].type === 'section-break' 
                        ? `linear-gradient(135deg, ${slides[currentSlide].style?.primary || '#6366F1'}, ${slides[currentSlide].style?.secondary || '#8B5CF6'})`
                        : undefined
                    }}
                  >
                    {/* Background Image */}
                    {slides[currentSlide].image && (
                      <div className="absolute inset-0 opacity-10">
                        <img 
                          src={slides[currentSlide].image.url}
                          alt={slides[currentSlide].image.alt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className={`space-y-6 relative z-10 ${slides[currentSlide].type === 'title' || slides[currentSlide].type === 'section-break' ? 'text-center' : ''}`}>
                      <div>
                        <h2 
                          className="text-3xl font-bold mb-2"
                          style={{ 
                            color: slides[currentSlide].type === 'section-break' 
                              ? '#FFFFFF' 
                              : slides[currentSlide].style?.primary || '#1F2937'
                          }}
                        >
                          {slides[currentSlide].title}
                        </h2>
                        {slides[currentSlide].subtitle && (
                          <p 
                            className="text-xl"
                            style={{ 
                              color: slides[currentSlide].type === 'section-break' 
                                ? 'rgba(255,255,255,0.9)' 
                                : slides[currentSlide].style?.text || '#6B7280'
                            }}
                          >
                            {slides[currentSlide].subtitle}
                          </p>
                        )}
                      </div>

                      {/* Statistics Display */}
                      {slides[currentSlide].statistics && (
                        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                          {slides[currentSlide].statistics.map((stat: any, index: number) => (
                            <div key={index} className="text-center bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                              <div className="text-3xl font-bold text-primary mb-1">
                                {stat.value}
                              </div>
                              <div className="text-sm text-muted-foreground leading-tight">
                                {stat.label}
                              </div>
                              {stat.source && (
                                <div className="text-xs text-muted-foreground mt-1 opacity-75">
                                  {stat.source}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quote Display */}
                      {slides[currentSlide].quote && (
                        <div className="max-w-3xl mx-auto text-center bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-sm">
                          <blockquote className="text-xl italic text-foreground mb-4">
                            "{slides[currentSlide].quote.text}"
                          </blockquote>
                          <div className="text-primary font-semibold">
                            — {slides[currentSlide].quote.author}
                          </div>
                          {slides[currentSlide].quote.role && (
                            <div className="text-sm text-muted-foreground">
                              {slides[currentSlide].quote.role}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Chart Display */}
                      {slides[currentSlide].chart && (
                        <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-sm">
                          <h4 className="text-lg font-semibold text-center mb-4">
                            {slides[currentSlide].chart.title}
                          </h4>
                          <div className="h-48 flex items-end justify-center space-x-2">
                            {slides[currentSlide].chart.type === 'bar' && slides[currentSlide].chart.data.map((item: any, index: number) => (
                              <div key={index} className="flex flex-col items-center space-y-2">
                                <div 
                                  className="bg-primary rounded-t"
                                  style={{ 
                                    width: '40px',
                                    height: `${(item.value / 100) * 120}px`,
                                    minHeight: '20px'
                                  }}
                                />
                                <div className="text-xs text-center font-medium">
                                  {item.category}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.value}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Regular Content Points */}
                      {slides[currentSlide].points && !slides[currentSlide].statistics && !slides[currentSlide].quote && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                          {slides[currentSlide].points.map((point: string, index: number) => (
                            <div key={index} className="flex items-start space-x-4">
                              <div 
                                className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                                style={{ backgroundColor: slides[currentSlide].style?.accent || '#F59E0B' }}
                              />
                              <p 
                                className="text-lg leading-relaxed"
                                style={{ color: slides[currentSlide].style?.text || '#1F2937' }}
                              >
                                {point}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Image with Caption */}
                      {slides[currentSlide].image && slides[currentSlide].type !== 'section-break' && (
                        <div className="max-w-md mx-auto">
                          <img 
                            src={slides[currentSlide].image.url}
                            alt={slides[currentSlide].image.alt}
                            className="w-full h-48 object-cover rounded-lg shadow-md"
                          />
                          {slides[currentSlide].image.caption && (
                            <p className="text-sm text-muted-foreground text-center mt-2">
                              {slides[currentSlide].image.caption}
                            </p>
                          )}
                        </div>
                      )}

                      {slides[currentSlide].cta && (
                        <div className="flex justify-center mt-8">
                          <div 
                            className="px-8 py-3 rounded-lg font-semibold text-white"
                            style={{ backgroundColor: slides[currentSlide].style?.accent || '#F59E0B' }}
                          >
                            {slides[currentSlide].cta}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slide Info Panel */}
                  <div className="bg-muted/50 p-6 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-primary" />
                          Timing & Notes
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <Badge variant="secondary">{slides[currentSlide].duration} minutes</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Speaker Notes:</span>
                            <p className="mt-1 text-foreground leading-relaxed">
                              {slides[currentSlide].notes}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Eye className="h-4 w-4 mr-2 text-primary" />
                          Visual Elements
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Template:</span>
                            <Badge variant="outline" className="ml-2">
                              {templates.find(t => t.id === selectedTemplate)?.name}
                            </Badge>
                          </div>
                          
                          {/* Image Information */}
                          {slides[currentSlide].image && (
                            <div>
                              <span className="text-muted-foreground">Image:</span>
                              <div className="mt-1 flex items-center space-x-2">
                                <img 
                                  src={slides[currentSlide].image.url}
                                  alt={slides[currentSlide].image.alt}
                                  className="w-12 h-8 object-cover rounded border"
                                />
                                <div className="flex-1">
                                  <p className="text-xs text-foreground">{slides[currentSlide].image.alt}</p>
                                  <p className="text-xs text-muted-foreground">Source: {slides[currentSlide].image.source}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Statistics Information */}
                          {slides[currentSlide].statistics && (
                            <div>
                              <span className="text-muted-foreground">Statistics:</span>
                              <div className="mt-1 space-y-1">
                                {slides[currentSlide].statistics.slice(0, 2).map((stat: any, index: number) => (
                                  <div key={index} className="text-xs">
                                    <span className="font-medium text-primary">{stat.value}</span> - {stat.label}
                                  </div>
                                ))}
                                {slides[currentSlide].statistics.length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{slides[currentSlide].statistics.length - 2} more stats
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quote Information */}
                          {slides[currentSlide].quote && (
                            <div>
                              <span className="text-muted-foreground">Quote:</span>
                              <div className="mt-1">
                                <p className="text-xs text-foreground italic">
                                  "{slides[currentSlide].quote.text.substring(0, 60)}..."
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  — {slides[currentSlide].quote.author}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Chart Information */}
                          {slides[currentSlide].chart && (
                            <div>
                              <span className="text-muted-foreground">Chart:</span>
                              <div className="mt-1">
                                <p className="text-xs text-foreground">{slides[currentSlide].chart.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {slides[currentSlide].chart.type} chart with {slides[currentSlide].chart.data.length} data points
                                </p>
                              </div>
                            </div>
                          )}

                          {slides[currentSlide].visual && (
                            <div>
                              <span className="text-muted-foreground">Suggested Visual:</span>
                              <p className="mt-1 text-foreground italic">
                                {slides[currentSlide].visual}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-3">
                            <span className="text-muted-foreground text-xs">Colors:</span>
                            {slides[currentSlide].style && Object.values(slides[currentSlide].style).slice(0, 4).map((color: any, index: number) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options */}
      {hasSlides && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Download className="h-5 w-5 mr-2 text-primary" />
              Professional Export Options
            </CardTitle>
            <CardDescription>
              Download your professionally designed slides in multiple formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={handleExportPPTX}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <Download className="h-6 w-6 text-primary" />
                )}
                <div className="text-center">
                  <div className="font-medium">
                    {isExporting ? 'Exporting...' : 'PowerPoint (PPTX)'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isExporting ? 'Generating file...' : 'Editable presentation'}
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => {
                  try {
                    const slideGenerator = new SlideGenerator({
                      templateId: selectedTemplate,
                      outline: data.outline,
                      duration: data.duration,
                      audience: data.audience,
                      topic: data.topic
                    })
                    
                    const speakerNotes = slideGenerator.generateSpeakerNotes()
                    const blob = new Blob([speakerNotes], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${data.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_speaker_notes.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                    
                    toast({
                      title: 'Speaker notes exported!',
                      description: 'Your presentation script has been downloaded.'
                    })
                  } catch (error) {
                    toast({
                      title: 'Export failed',
                      description: 'Unable to export speaker notes. Please try again.',
                      variant: 'destructive'
                    })
                  }
                }}
              >
                <Download className="h-6 w-6 text-primary" />
                <div className="text-center">
                  <div className="font-medium">Speaker Notes</div>
                  <div className="text-xs text-muted-foreground">Complete script</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={handleUploadPPTX}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-primary" />
                )}
                <div className="text-center">
                  <div className="font-medium">
                    {isUploading ? 'Uploading...' : 'Upload Modified'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isUploading ? 'Processing file...' : 'Import PPTX changes'}
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">Enhanced Webinar Experience</p>
                  <p className="text-muted-foreground">
                    Your slides include professional images, relevant statistics, inspiring quotes, and data visualizations to create an engaging webinar presentation that keeps your audience captivated.
                  </p>
                  {hasSlides && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slides.filter(slide => slide.image).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          📸 {slides.filter(slide => slide.image).length} Images
                        </Badge>
                      )}
                      {slides.filter(slide => slide.statistics).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          📊 {slides.filter(slide => slide.statistics).length} Stats
                        </Badge>
                      )}
                      {slides.filter(slide => slide.quote).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          💬 {slides.filter(slide => slide.quote).length} Quotes
                        </Badge>
                      )}
                      {slides.filter(slide => slide.chart).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          📈 {slides.filter(slide => slide.chart).length} Charts
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous Step
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!hasSlides}
          size="lg"
        >
          Continue to Voice & Video
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Hidden file input for PPTX upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Token Usage Info */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Token Usage</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm">
            <span>Slide generation</span>
            <Badge variant="secondary">~100-200 tokens</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}