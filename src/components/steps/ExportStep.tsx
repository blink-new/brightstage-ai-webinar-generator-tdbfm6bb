import { useState } from 'react'
import { Download, Share2, Link, Mail, ArrowLeft, CheckCircle, Loader2, FileVideo, FileText, Presentation, Settings } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { WebinarData } from '../../types/webinar'
import { blink } from '../../blink/client'
import { useToast } from '../../hooks/use-toast'
import { VideoGenerator } from '../../utils/videoGenerator'
import { PPTXGenerator } from '../../utils/pptxGenerator'
import { WEBINAR_TEMPLATES } from '../../utils/webinarTemplates'

interface ExportStepProps {
  data: WebinarData
  onUpdate: (updates: Partial<WebinarData>) => void
  onPrev: () => void
  onComplete: () => void
}

const exportFormats = [
  {
    id: 'video-mp4',
    name: 'Full Webinar Video (MP4)',
    description: 'Complete webinar with narration and slides',
    icon: FileVideo,
    size: '~150-300MB',
    type: 'video'
  },
  {
    id: 'slides-pptx',
    name: 'Slides (PowerPoint)',
    description: 'Editable presentation slides',
    icon: Presentation,
    size: '~5-15MB',
    type: 'slides'
  },
  {
    id: 'slides-pdf',
    name: 'Slides (PDF)',
    description: 'Print-ready slide deck',
    icon: FileText,
    size: '~2-8MB',
    type: 'slides'
  },
  {
    id: 'script-docx',
    name: 'Script (Word Document)',
    description: 'Full narration script with timing',
    icon: FileText,
    size: '~1-3MB',
    type: 'script'
  },
  {
    id: 'pitch-video',
    name: 'Pitch Video (MP4)',
    description: '5-10 minute condensed version',
    icon: FileVideo,
    size: '~50-100MB',
    type: 'pitch'
  }
]

export function ExportStep({ data, onUpdate, onPrev, onComplete }: ExportStepProps) {
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false)
  const [downloadingFormats, setDownloadingFormats] = useState<Set<string>>(new Set())
  const [shareableLink, setShareableLink] = useState('')
  const [hasPitchVideo, setHasPitchVideo] = useState(false)
  const { toast } = useToast()

  const handleGeneratePitch = async () => {
    setIsGeneratingPitch(true)
    try {
      const result = await VideoGenerator.generatePitchVideo(data)
      
      // Update data with pitch video URL
      onUpdate({ pitchVideoUrl: result.url })
      setHasPitchVideo(true)
      
      toast({
        title: 'Pitch video generated!',
        description: `Your ${Math.round(result.duration / 60)}-minute pitch version is ready for download.`
      })
    } catch (error) {
      console.error('Pitch generation error:', error)
      toast({
        title: 'Pitch generation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingPitch(false)
    }
  }

  const handleTestPPTX = async () => {
    try {
      console.log('Testing PPTX generation...')
      const result = await PPTXGenerator.testPPTXGeneration()
      console.log('Test PPTX result:', result)
      
      if (result.success && result.blob) {
        console.log('Test blob details:', {
          size: result.blob.size,
          type: result.blob.type,
          isBlob: result.blob instanceof Blob
        })
        
        PPTXGenerator.downloadPPTX(result.blob, 'test-webinar.pptx')
        
        toast({
          title: 'Test PPTX generated successfully!',
          description: `File size: ${Math.round(result.blob.size / 1024)}KB`
        })
      } else {
        throw new Error(result.error || 'Test failed')
      }
    } catch (error) {
      console.error('Test PPTX error:', error)
      toast({
        title: 'Test PPTX failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }

  const handleDownload = async (formatId: string) => {
    // Prevent multiple simultaneous downloads of the same format
    if (downloadingFormats.has(formatId)) {
      return
    }
    
    setDownloadingFormats(prev => new Set(prev).add(formatId))
    
    try {
      const format = exportFormats.find(f => f.id === formatId)
      
      switch (formatId) {
        case 'video-mp4':
          if (data.videoUrl) {
            // Download main video
            const link = document.createElement('a')
            link.href = data.videoUrl
            link.download = `${data.topic?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'webinar'}_full_video.mp4`
            link.click()
          }
          break
          
        case 'slides-pptx':
          try {
            // Validate data before processing
            if (!data.slides || data.slides.length === 0) {
              throw new Error('No slides available to export. Please generate slides first.')
            }
            
            console.log('=== PPTX EXPORT DEBUG ===')
            console.log('Raw webinar data:', {
              title: data.topic,
              slideCount: data.slides.length,
              template: data.template,
              audience: data.audience,
              duration: data.duration
            })
            
            console.log('First slide raw data:', data.slides[0])
            console.log('Last slide raw data:', data.slides[data.slides.length - 1])
            
            // Show progress to user
            toast({
              title: 'Generating PowerPoint...',
              description: 'Creating your presentation file, this may take a moment.'
            })
            
            // Use requestAnimationFrame to prevent UI blocking during data preparation
            await new Promise(resolve => requestAnimationFrame(resolve))
            
            // Pass the data directly to PPTXGenerator - let it handle normalization
            const pptxData = await Promise.resolve().then(() => ({
              title: data.topic || 'Untitled Webinar',
              slides: data.slides, // Pass slides as-is, let PPTXGenerator normalize them
              template: data.template || 'modern-business',
              duration: data.duration || 30,
              audience: data.audience || 'General'
            }))
            
            console.log('Data passed to PPTXGenerator:', {
              title: pptxData.title,
              slideCount: pptxData.slides.length,
              template: pptxData.template,
              hasSlides: Array.isArray(pptxData.slides)
            })
            
            // Use setTimeout to ensure UI updates before heavy processing
            const result = await new Promise<any>((resolve, reject) => {
              setTimeout(async () => {
                try {
                  const generator = new PPTXGenerator()
                  const result = await generator.generatePPTX(pptxData)
                  resolve(result)
                } catch (error) {
                  reject(error)
                }
              }, 10) // Small delay to allow UI update
            })
            
            console.log('PPTX generation result:', {
              success: result.success,
              slideCount: result.slideCount,
              filename: result.filename,
              blobSize: result.blob?.size,
              error: result.error
            })
            
            if (result.success && result.blob) {
              console.log('Final blob validation:', {
                size: result.blob.size,
                type: result.blob.type,
                isBlob: result.blob instanceof Blob,
                isValidSize: result.blob.size > 1000
              })
              
              // Trigger the download immediately
              try {
                PPTXGenerator.downloadPPTX(result.blob, result.filename)
                
                toast({
                  title: 'PPTX downloaded successfully!',
                  description: `File "${result.filename}" (${Math.round(result.blob.size / 1024)}KB) should appear in your Downloads folder.`
                })
              } catch (downloadError) {
                console.error('Download failed:', downloadError)
                
                // Fallback: Try browser's built-in download
                const url = URL.createObjectURL(result.blob)
                const a = document.createElement('a')
                a.href = url
                a.download = result.filename
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                toast({
                  title: 'PPTX downloaded (fallback method)',
                  description: `File "${result.filename}" should appear in your Downloads folder.`
                })
              }
            } else {
              console.error('PPTX generation failed:', result.error)
              throw new Error(result.error || 'Failed to generate PPTX - no blob returned')
            }
          } catch (error) {
            console.error('=== PPTX EXPORT ERROR ===')
            console.error('Error details:', error)
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
            
            // Try fallback auto-download method
            try {
              console.log('Attempting fallback auto-download...')
              const generator = new PPTXGenerator()
              const pptxData = {
                title: data.topic || 'Untitled Webinar',
                slides: data.slides,
                template: data.template || 'modern-business',
                duration: data.duration || 30,
                audience: data.audience || 'General'
              }
              
              // Create a new instance for fallback
              const fallbackPptx = new (await import('pptxgenjs')).default()
              fallbackPptx.author = 'BrightStage AI'
              fallbackPptx.title = pptxData.title
              
              // Add minimal slides
              pptxData.slides.forEach((slide: any, index: number) => {
                const pptxSlide = fallbackPptx.addSlide()
                pptxSlide.addText(slide.title || `Slide ${index + 1}`, {
                  x: 0.5, y: 0.5, w: 9, h: 1,
                  fontSize: 24, bold: true, color: '333333'
                })
                if (slide.content && slide.content.length > 0) {
                  const contentText = slide.content.map((item: string) => `• ${item}`).join('\n')
                  pptxSlide.addText(contentText, {
                    x: 0.5, y: 1.8, w: 9, h: 3,
                    fontSize: 16, color: '666666'
                  })
                }
              })
              
              // Use writeFile for auto-download as true fallback
              await fallbackPptx.writeFile({ fileName: `${pptxData.title.replace(/[^a-z0-9]/gi, '_')}.pptx` })
              
              toast({
                title: 'PPTX downloaded via fallback',
                description: 'File was auto-downloaded. Check your downloads folder.'
              })
            } catch (fallbackError) {
              console.error('Fallback download also failed:', fallbackError)
              
              // Provide specific error messages based on error type
              let userMessage = 'Failed to export PowerPoint slides'
              if (error instanceof Error) {
                if (error.message.includes('base64')) {
                  userMessage = 'PowerPoint generation failed due to encoding issues. Please try again.'
                } else if (error.message.includes('blob')) {
                  userMessage = 'PowerPoint file creation failed. Please try again or contact support.'
                } else if (error.message.includes('slides')) {
                  userMessage = 'No slides available to export. Please generate slides first.'
                } else if (error.message.includes('template')) {
                  userMessage = 'Template loading failed. Please try with a different template.'
                } else if (error.message.includes('validation')) {
                  userMessage = 'Slide data validation failed. Please regenerate your slides.'
                } else {
                  userMessage = `PowerPoint export failed: ${error.message}`
                }
              }
              
              throw new Error(userMessage)
            }
          }
          break
          
        case 'slides-pdf':
          // Convert PPTX to PDF (mock implementation)
          await new Promise(resolve => setTimeout(resolve, 1000))
          break
          
        case 'script-docx':
          if (data.script) {
            const blob = new Blob([data.script], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${data.topic?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'webinar'}_script.txt`
            link.click()
            URL.revokeObjectURL(url)
          }
          break
          
        case 'pitch-video':
          if (data.pitchVideoUrl) {
            const link = document.createElement('a')
            link.href = data.pitchVideoUrl
            link.download = `${data.topic?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'webinar'}_pitch.mp4`
            link.click()
          }
          break
          
        default:
          await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      toast({
        title: 'Download started',
        description: `${format?.name} is being downloaded.`
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setDownloadingFormats(prev => {
        const newSet = new Set(prev)
        newSet.delete(formatId)
        return newSet
      })
    }
  }

  const handleGenerateShareLink = () => {
    const mockLink = `https://brightstage.ai/webinar/${Math.random().toString(36).substr(2, 9)}`
    setShareableLink(mockLink)
    toast({
      title: 'Shareable link generated!',
      description: 'You can now share your webinar with others.'
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'Link has been copied to your clipboard.'
    })
  }

  return (
    <div className="space-y-8">
      {/* Completion Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Webinar Complete!</h3>
              <p className="text-green-700">
                Your "{data.topic}" webinar has been successfully generated
              </p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-green-900">Duration</div>
              <div className="text-green-700">{data.duration} minutes</div>
            </div>
            <div>
              <div className="font-medium text-green-900">Slides</div>
              <div className="text-green-700">{data.slides?.length || 0} slides</div>
            </div>
            <div>
              <div className="font-medium text-green-900">Template</div>
              <div className="text-green-700 capitalize">{data.template || 'Modern'}</div>
            </div>
            <div>
              <div className="font-medium text-green-900">Voice</div>
              <div className="text-green-700 capitalize">{data.voiceStyle?.replace('-', ' ') || 'Professional'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pitch Video Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileVideo className="h-5 w-5" />
            <span>Generate Pitch Video</span>
          </CardTitle>
          <CardDescription>
            Create a condensed 5-10 minute version highlighting key points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Perfect for social media, email campaigns, or quick previews
              </p>
              {hasPitchVideo && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Pitch video ready
                </Badge>
              )}
            </div>
            <Button
              onClick={handleGeneratePitch}
              disabled={isGeneratingPitch || hasPitchVideo}
              variant={hasPitchVideo ? "outline" : "default"}
            >
              {isGeneratingPitch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : hasPitchVideo ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Generated
                </>
              ) : (
                <>
                  <FileVideo className="h-4 w-4 mr-2" />
                  Generate Pitch
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Download Your Webinar</CardTitle>
          <CardDescription>
            Choose from multiple formats to suit your needs
          </CardDescription>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestPPTX}
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Test PPTX
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exportFormats.map((format) => {
              const isDownloading = downloadingFormats.has(format.id)
              const isAvailable = format.type !== 'pitch' || hasPitchVideo
              
              return (
                <div key={format.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <format.icon className="h-8 w-8 text-primary" />
                    <div>
                      <h4 className="font-medium">{format.name}</h4>
                      <p className="text-sm text-muted-foreground">{format.description}</p>
                      <Badge variant="outline" className="mt-1">
                        {format.size}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDownload(format.id)}
                    disabled={isDownloading || !isAvailable}
                    variant="outline"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sharing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Your Webinar</span>
          </CardTitle>
          <CardDescription>
            Generate shareable links and embed codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={handleGenerateShareLink} variant="outline">
              <Link className="h-4 w-4 mr-2" />
              Generate Share Link
            </Button>
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email Templates
            </Button>
          </div>

          {shareableLink && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Shareable Link</label>
              <div className="flex space-x-2">
                <Input value={shareableLink} readOnly />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(shareableLink)}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view your webinar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Insights</CardTitle>
          <CardDescription>
            Track performance once your webinar is shared
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Views</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Shares</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">0%</div>
              <div className="text-sm text-muted-foreground">Completion</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous Step
        </Button>
        
        <Button onClick={onComplete} size="lg" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete & Return to Dashboard
        </Button>
      </div>

      {/* Success Message */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Congratulations!</h3>
          <p className="text-muted-foreground">
            You've successfully created a professional webinar with BrightStage AI. 
            Your content is ready to engage and educate your audience.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}