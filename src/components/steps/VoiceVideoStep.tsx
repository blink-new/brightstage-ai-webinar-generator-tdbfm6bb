import { useState } from 'react'
import { Mic, Video, Play, Pause, ArrowLeft, ArrowRight, Loader2, Volume2, Settings, Download, Smartphone, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import type { WebinarData } from '../../types/webinar'
import { blink } from '../../blink/client'
import { useToast } from '../../hooks/use-toast'
import { VideoGenerator, VideoGenerationOptions, VideoGenerationProgress } from '../../utils/videoGenerator'
import { APIErrorHandler } from '../../utils/apiErrorHandler'
import { useMobilePerformance, performanceUtils } from '../../hooks/use-mobile-performance'
import { createSecureDownloadLink, logSecurityEvent } from '../../utils/securityUtils'

interface VoiceVideoStepProps {
  data: WebinarData
  onUpdate: (updates: Partial<WebinarData>) => void
  onNext: () => void
  onPrev: () => void
}

const voiceStyles = [
  { id: 'professional-male', name: 'Professional Male', description: 'Clear, authoritative business voice' },
  { id: 'professional-female', name: 'Professional Female', description: 'Warm, confident presentation voice' },
  { id: 'enthusiastic-male', name: 'Enthusiastic Male', description: 'Energetic, engaging speaker' },
  { id: 'enthusiastic-female', name: 'Enthusiastic Female', description: 'Dynamic, inspiring presenter' },
  { id: 'calm-male', name: 'Calm Male', description: 'Steady, reassuring narrator' },
  { id: 'calm-female', name: 'Calm Female', description: 'Gentle, educational tone' }
]

const ttsProviders = [
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Premium quality, natural voices' },
  { id: 'openai', name: 'OpenAI TTS', description: 'High quality, cost-effective' },
  { id: 'google', name: 'Google Cloud TTS', description: 'Reliable, multilingual support' },
  { id: 'azure', name: 'Microsoft Azure TTS', description: 'Enterprise-grade speech synthesis' }
]

export function VoiceVideoStep({ data, onUpdate, onNext, onPrev }: VoiceVideoStepProps) {
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState<VideoGenerationProgress | null>(null)
  const [selectedVoice, setSelectedVoice] = useState(data.voiceStyle || 'professional-female')
  const [selectedTTS, setSelectedTTS] = useState(data.ttsProvider || 'elevenlabs')
  const [script, setScript] = useState(data.script || '')
  const [previewAudio, setPreviewAudio] = useState<string | null>(null)
  
  // Mobile performance optimization
  const mobileConfig = useMobilePerformance()
  const recommendedSettings = performanceUtils.getRecommendedVideoSettings(mobileConfig)
  
  const [videoOptions, setVideoOptions] = useState<VideoGenerationOptions>({
    quality: recommendedSettings.quality,
    format: 'mp4',
    resolution: recommendedSettings.resolution,
    includeAvatar: false
  })
  const { toast } = useToast()

  const handleGenerateScript = async () => {
    if (!data.slides || data.slides.length === 0) {
      toast({
        title: 'No slides available',
        description: 'Please complete the slide design step first.',
        variant: 'destructive'
      })
      return
    }

    if (!blink) {
      toast({
        title: 'Service unavailable',
        description: 'AI script generation is currently unavailable. Please write your own script.',
        variant: 'destructive'
      })
      return
    }

    setIsGeneratingScript(true)
    try {
      // Use Promise.resolve to move JSON.stringify to microtask queue to prevent blocking
      const slidesData = await Promise.resolve().then(() => 
        JSON.stringify(data.slides, null, 2)
      )
      
      const prompt = `Create a natural, conversational narration script for this webinar presentation:

        Topic: ${data.topic}
        Audience: ${data.audience}
        Duration: ${data.duration} minutes
        Voice Style: ${selectedVoice}

        Slides:
        ${slidesData}

        Requirements:
        1. Natural, conversational tone appropriate for ${selectedVoice}
        2. Smooth transitions between slides
        3. Engaging delivery with appropriate pauses
        4. Time each section to match slide durations
        5. Include natural speech patterns (um, well, you know - sparingly)
        6. Add emphasis markers for important points
        7. Include breathing pauses and natural rhythm

        Format the script with timing cues:
        [00:00] Welcome everyone to today's presentation on...
        [00:30] *pause* Now, let's dive into our first topic...
        [02:15] As you can see on this slide... *emphasis on "see"*

        Make it sound like a real person presenting, not reading from a script.`

      const text = await APIErrorHandler.generateTextWithRetry(prompt, {
        model: 'gpt-4o-mini',
        maxTokens: 3000,
        retryOptions: { maxRetries: 3, baseDelay: 1000 },
        fallbackOptions: { enableFallbacks: true }
      })

      setScript(text)
      onUpdate({ script: text, voiceStyle: selectedVoice, ttsProvider: selectedTTS })
      toast({
        title: 'Script generated!',
        description: 'Your narration script has been created successfully.'
      })
    } catch (error) {
      const userMessage = APIErrorHandler.getUserFriendlyErrorMessage(
        error instanceof Error ? error : new Error('Unknown error'),
        'Script Generation'
      )
      toast({
        title: 'Script generation failed',
        description: userMessage,
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingScript(false)
    }
  }

  const handlePreviewVoice = async () => {
    if (!script) {
      toast({
        title: 'No script available',
        description: 'Please generate or write a script first.',
        variant: 'destructive'
      })
      return
    }

    if (!blink) {
      toast({
        title: 'Service unavailable',
        description: 'Voice preview is currently unavailable. Please try again later.',
        variant: 'destructive'
      })
      return
    }

    try {
      // Generate a short preview of the first 30 seconds
      const previewText = script.split('\n').slice(0, 3).join(' ').substring(0, 200) + '...'
      
      const { url } = await blink.ai.generateSpeech({
        text: previewText,
        voice: 'nova' // Using OpenAI's voice for preview
      })

      setPreviewAudio(url)
      toast({
        title: 'Preview ready!',
        description: 'Click play to hear a sample of your narration.'
      })
    } catch (error) {
      toast({
        title: 'Preview failed',
        description: 'Unable to generate voice preview. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleGenerateVideo = async () => {
    // Prevent multiple simultaneous calls
    if (isGeneratingVideo) {
      return
    }
    
    // Check mobile performance and warn user if needed
    if (mobileConfig.isMobile && !performanceUtils.canHandleVideoGeneration(mobileConfig)) {
      toast({
        title: 'Device Performance Warning',
        description: 'Your device may struggle with video generation. Consider using a desktop computer for better performance.',
        variant: 'destructive'
      })
    }
    
    // Check memory usage
    const memoryUsage = performanceUtils.monitorMemoryUsage()
    if (memoryUsage.percentage > 70) {
      toast({
        title: 'High Memory Usage Detected',
        description: `Memory usage is at ${Math.round(memoryUsage.percentage)}%. Close other tabs for better performance.`,
        variant: 'destructive'
      })
    }
    
    // Comprehensive validation
    if (!script || script.trim().length < 50) {
      toast({
        title: 'Script too short',
        description: 'Please generate or write a script with at least 50 characters.',
        variant: 'destructive'
      })
      return
    }

    if (!data.slides || data.slides.length === 0) {
      toast({
        title: 'No slides available',
        description: 'Please complete the slide design step first.',
        variant: 'destructive'
      })
      return
    }

    if (data.slides.length > 50) {
      toast({
        title: 'Too many slides',
        description: 'Video generation supports up to 50 slides. Please reduce your slide count.',
        variant: 'destructive'
      })
      return
    }

    if (!blink) {
      toast({
        title: 'Service unavailable',
        description: 'Video generation service is currently unavailable. Please try again later.',
        variant: 'destructive'
      })
      return
    }

    setIsGeneratingVideo(true)
    setVideoProgress(null)

    try {
      // Update data with current voice settings
      const updatedData = {
        ...data,
        script,
        voiceStyle: selectedVoice,
        ttsProvider: selectedTTS
      }

      // Validate data before starting generation
      if (!updatedData.topic || !updatedData.audience) {
        throw new Error('Missing webinar topic or audience information')
      }

      const videoGenerator = new VideoGenerator(
        updatedData,
        videoOptions,
        (progress) => {
          setVideoProgress(progress)
          console.log(`Video generation progress: ${progress.stage} - ${progress.progress}%`)
        }
      )

      const result = await videoGenerator.generateVideo()
      
      onUpdate({ 
        videoUrl: result.url,
        script,
        voiceStyle: selectedVoice,
        ttsProvider: selectedTTS
      })

      toast({
        title: 'Video generated successfully!',
        description: `Your ${Math.round(result.duration / 60)}-minute webinar video is ready for preview and export.`
      })

      // Log success for debugging
      console.log('Video generation completed:', {
        url: result.url,
        duration: result.duration,
        size: result.size,
        slides: data.slides.length,
        scriptLength: script.length
      })

    } catch (error) {
      console.error('Video generation error:', error)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Please try again or adjust your settings.'
      
      if (error instanceof Error) {
        if (error.message.includes('audio')) {
          errorMessage = 'Failed to generate audio narration. Please check your script and try again.'
        } else if (error.message.includes('slides')) {
          errorMessage = 'Failed to create slide images. Please check your slides and try again.'
        } else if (error.message.includes('video')) {
          errorMessage = 'Failed to assemble video. Please try with different settings.'
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: 'Video generation failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingVideo(false)
      setVideoProgress(null)
    }
  }

  const hasScript = script.length > 0
  const hasVideo = !!data.videoUrl

  return (
    <div className="space-y-8">
      {/* Mobile Performance Warning */}
      {mobileConfig.isMobile && (
        <Card className={`border-2 ${mobileConfig.isLowEndDevice ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {mobileConfig.isLowEndDevice ? (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <Smartphone className="h-5 w-5 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${mobileConfig.isLowEndDevice ? 'text-red-800' : 'text-yellow-800'}`}>
                  {mobileConfig.isLowEndDevice ? 'Low-End Device Detected' : 'Mobile Device Detected'}
                </h4>
                <p className={`text-sm mt-1 ${mobileConfig.isLowEndDevice ? 'text-red-700' : 'text-yellow-700'}`}>
                  {mobileConfig.isLowEndDevice 
                    ? 'Video generation may be slow or fail on this device. Consider using a desktop computer.'
                    : 'Video settings have been optimized for mobile performance. Generation may take longer than on desktop.'
                  }
                </p>
                <div className="mt-2 text-xs space-y-1">
                  <div className={mobileConfig.isLowEndDevice ? 'text-red-600' : 'text-yellow-600'}>
                    • Max resolution: {mobileConfig.maxResolution}
                  </div>
                  <div className={mobileConfig.isLowEndDevice ? 'text-red-600' : 'text-yellow-600'}>
                    • Recommended quality: {recommendedSettings.quality}
                  </div>
                  <div className={mobileConfig.isLowEndDevice ? 'text-red-600' : 'text-yellow-600'}>
                    • Memory limit: {mobileConfig.memoryLimit}MB
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Selection */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Mic className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Voice Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice Style</label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voiceStyles.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div>
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-sm text-muted-foreground">{voice.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">TTS Provider</label>
            <Select value={selectedTTS} onValueChange={setSelectedTTS}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ttsProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-muted-foreground">{provider.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Script Generation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Narration Script</h3>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePreviewVoice}
              disabled={!hasScript}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Preview Voice
            </Button>
            <Button
              onClick={handleGenerateScript}
              disabled={isGeneratingScript}
            >
              {isGeneratingScript ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Generate Script
                </>
              )}
            </Button>
          </div>
        </div>

        <Textarea
          placeholder="Your narration script will appear here, or you can write your own..."
          value={script}
          onChange={(e) => {
            setScript(e.target.value)
            onUpdate({ script: e.target.value })
          }}
          rows={12}
          className="font-mono text-sm"
        />

        {previewAudio && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Volume2 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Voice Preview</p>
                  <p className="text-xs text-muted-foreground">Sample of your selected voice</p>
                </div>
                <audio controls src={previewAudio} className="h-8">
                  Your browser does not support the audio element.
                </audio>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Video Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <Select 
              value={videoOptions.quality} 
              onValueChange={(value: 'low' | 'medium' | 'high') => 
                setVideoOptions(prev => ({ ...prev, quality: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Faster)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Best Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <Select 
              value={videoOptions.resolution} 
              onValueChange={(value: '720p' | '1080p' | '4k') => 
                setVideoOptions(prev => ({ ...prev, resolution: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p HD</SelectItem>
                <SelectItem value="1080p">1080p Full HD</SelectItem>
                <SelectItem value="4k">4K Ultra HD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select 
              value={videoOptions.format} 
              onValueChange={(value: 'mp4' | 'webm') => 
                setVideoOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Video Generation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Video Generation</h3>
          </div>
          <Button
            onClick={handleGenerateVideo}
            disabled={!hasScript || isGeneratingVideo}
            size="lg"
          >
            {isGeneratingVideo ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Generate Webinar Video
              </>
            )}
          </Button>
        </div>

        {isGeneratingVideo && videoProgress && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span 
                    className="text-sm font-medium"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {videoProgress.message}
                  </span>
                  <span 
                    className="text-sm text-muted-foreground"
                    aria-label={`Progress: ${Math.round(videoProgress.progress)} percent complete`}
                  >
                    {Math.round(videoProgress.progress)}%
                  </span>
                </div>
                <Progress 
                  value={videoProgress.progress} 
                  className="h-2" 
                  role="progressbar"
                  aria-valuenow={Math.round(videoProgress.progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Video generation progress"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span aria-label={`Current stage: ${videoProgress.stage.replace('_', ' ')}`}>
                    Stage: {videoProgress.stage.replace('_', ' ')}
                  </span>
                  {videoProgress.estimatedTimeRemaining && (
                    <span aria-label={`Estimated time remaining: ${Math.round(videoProgress.estimatedTimeRemaining / 60)} minutes`}>
                      ~{Math.round(videoProgress.estimatedTimeRemaining / 60)} minutes remaining
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasVideo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Preview</CardTitle>
              <CardDescription>
                Your generated webinar video is ready for preview and export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                {data.videoUrl ? (
                  <video 
                    key={data.videoUrl}
                    controls 
                    className="w-full h-full"
                    poster="https://via.placeholder.com/1920x1080/6366F1/FFFFFF?text=Webinar+Video"
                    preload="metadata"
                    aria-label={`Webinar video: ${data.topic || 'Generated webinar'}, duration approximately ${data.duration} minutes`}
                    aria-describedby="video-description"
                  >
                    <source src={data.videoUrl} type="video/mp4" />
                    <track kind="captions" src="" label="English captions" default />
                    Your browser doesn't support video playback. You can download the video using the download button below.
                  </video>
                ) : (
                  <div 
                    className="flex items-center justify-center h-full text-white"
                    role="status"
                    aria-live="polite"
                    aria-label="Video preview loading"
                  >
                    <div className="text-center">
                      <Video className="h-12 w-12 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm">Video preview loading...</p>
                      <p className="text-xs mt-1 text-gray-300">
                        Duration: ~{data.duration} minutes
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Hidden description for screen readers */}
              <div id="video-description" className="sr-only">
                This is a generated webinar video about {data.topic || 'the selected topic'} 
                for {data.audience || 'the target audience'}. 
                The video contains {data.slides?.length || 0} slides and has a duration of approximately {data.duration} minutes.
                Use the video controls to play, pause, adjust volume, or enter fullscreen mode.
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{data.duration} min</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Slides</p>
                  <p className="font-medium">{data.slides?.length || 0}</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className="font-medium capitalize">{videoOptions.quality}</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Resolution</p>
                  <p className="font-medium">{videoOptions.resolution}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Video controls">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const video = document.querySelector('video')
                    if (video) {
                      if (video.paused) {
                        video.play()
                        toast({
                          title: 'Video playing',
                          description: 'The webinar video is now playing.'
                        })
                      } else {
                        video.pause()
                        toast({
                          title: 'Video paused',
                          description: 'The webinar video has been paused.'
                        })
                      }
                    }
                  }}
                  aria-label="Toggle video playback - play or pause the webinar video"
                >
                  <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  Play/Pause
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const video = document.querySelector('video')
                    if (video && video.requestFullscreen) {
                      video.requestFullscreen()
                      toast({
                        title: 'Entering fullscreen',
                        description: 'Video is now in fullscreen mode. Press Escape to exit.'
                      })
                    } else {
                      toast({
                        title: 'Fullscreen not supported',
                        description: 'Your browser does not support fullscreen video.',
                        variant: 'destructive'
                      })
                    }
                  }}
                  aria-label="Enter fullscreen mode for better video viewing"
                >
                  <Video className="h-4 w-4 mr-2" aria-hidden="true" />
                  Full Screen
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (data.videoUrl) {
                      try {
                        // Use requestAnimationFrame to prevent UI blocking
                        await new Promise(resolve => requestAnimationFrame(resolve))
                        
                        const filename = `${(data.topic || 'webinar').replace(/\s+/g, '_')}_webinar.mp4`
                        
                        // Create secure download link with validation
                        const secureDownload = createSecureDownloadLink(
                          data.videoUrl,
                          filename,
                          'video/mp4'
                        )
                        
                        if (!secureDownload.success) {
                          logSecurityEvent('invalid_url', {
                            context: 'video_download',
                            url: data.videoUrl,
                            error: secureDownload.error
                          })
                          throw new Error(secureDownload.error)
                        }
                        
                        // Add to DOM and trigger download asynchronously
                        document.body.appendChild(secureDownload.element!)
                        
                        // Use setTimeout to ensure DOM update completes
                        setTimeout(() => {
                          secureDownload.element!.click()
                          setTimeout(() => {
                            if (document.body.contains(secureDownload.element!)) {
                              document.body.removeChild(secureDownload.element!)
                            }
                          }, 100)
                        }, 0)
                        
                        toast({
                          title: 'Download started',
                          description: 'Your webinar video download has begun.'
                        })
                        
                      } catch (error) {
                        console.error('Download failed:', error)
                        logSecurityEvent('file_validation_failed', {
                          context: 'video_download_failed',
                          url: data.videoUrl,
                          error: error instanceof Error ? error.message : 'Unknown error'
                        })
                        toast({
                          title: 'Download failed',
                          description: 'Unable to download video securely. Please try again.',
                          variant: 'destructive'
                        })
                      }
                    }
                  }}
                  aria-label={`Download webinar video file: ${(data.topic || 'webinar').replace(/\s+/g, '_')}_webinar.mp4`}
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Download Video
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous Step
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!hasVideo}
          size="lg"
        >
          Continue to Export
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Token Usage Info */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Token Usage</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Script generation</span>
              <Badge variant="secondary">~150-300 tokens</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Voice synthesis</span>
              <Badge variant="secondary">~500-1000 tokens</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Video assembly</span>
              <Badge variant="secondary">~200-400 tokens</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}