import { useState } from 'react'
import { Mic, Video, Play, Pause, ArrowLeft, ArrowRight, Loader2, Volume2, Settings, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { WebinarData } from '../WebinarCreator'
import { blink } from '../../blink/client'
import { useToast } from '../../hooks/use-toast'
import { VideoGenerator, VideoGenerationOptions, VideoGenerationProgress } from '../../utils/videoGenerator'

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
  const [videoOptions, setVideoOptions] = useState<VideoGenerationOptions>({
    quality: 'medium',
    format: 'mp4',
    resolution: '1080p',
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
      const { text } = await blink.ai.generateText({
        prompt: `Create a natural, conversational narration script for this webinar presentation:

        Topic: ${data.topic}
        Audience: ${data.audience}
        Duration: ${data.duration} minutes
        Voice Style: ${selectedVoice}

        Slides:
        ${JSON.stringify(data.slides, null, 2)}

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

        Make it sound like a real person presenting, not reading from a script.`,
        model: 'gpt-4o-mini'
      })

      setScript(text)
      onUpdate({ script: text, voiceStyle: selectedVoice, ttsProvider: selectedTTS })
      toast({
        title: 'Script generated!',
        description: 'Your narration script has been created successfully.'
      })
    } catch (error) {
      toast({
        title: 'Script generation failed',
        description: 'Please try again or write your own script.',
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
    if (!script || !data.slides) {
      toast({
        title: 'Missing requirements',
        description: 'Please ensure you have both slides and script ready.',
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

      const videoGenerator = new VideoGenerator(
        updatedData,
        videoOptions,
        (progress) => setVideoProgress(progress)
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
    } catch (error) {
      console.error('Video generation error:', error)
      toast({
        title: 'Video generation failed',
        description: error instanceof Error ? error.message : 'Please try again or adjust your settings.',
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
                  <span className="text-sm font-medium">{videoProgress.message}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(videoProgress.progress)}%</span>
                </div>
                <Progress value={videoProgress.progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Stage: {videoProgress.stage.replace('_', ' ')}</span>
                  {videoProgress.estimatedTimeRemaining && (
                    <span>
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
                Your generated webinar video is ready
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Video preview would appear here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: ~{data.duration} minutes
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Play Preview
                </Button>
                <Button variant="outline">
                  <Video className="h-4 w-4 mr-2" />
                  Full Screen
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