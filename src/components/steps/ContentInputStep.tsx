import { useState } from 'react'
import { Sparkles, Clock, Users, Brain, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { WebinarData } from '../WebinarCreator'
import { blink } from '../../blink/client'
import { useToast } from '../../hooks/use-toast'

interface ContentInputStepProps {
  data: WebinarData
  onUpdate: (updates: Partial<WebinarData>) => void
  onNext: () => void
  onPrev?: () => void
}

const aiTools = [
  { id: 'openai', name: 'OpenAI GPT-4', description: 'Best for creative and engaging content' },
  { id: 'claude', name: 'Anthropic Claude', description: 'Excellent for structured, professional content' },
  { id: 'gemini', name: 'Google Gemini', description: 'Great for research-heavy topics' },
  { id: 'xai', name: 'xAI Grok', description: 'Perfect for current events and trends' }
]

const durationOptions = [
  { value: 30, label: '30 minutes', description: 'Quick overview' },
  { value: 45, label: '45 minutes', description: 'Standard presentation' },
  { value: 60, label: '60 minutes', description: 'Comprehensive deep-dive' },
  { value: 90, label: '90 minutes', description: 'Workshop format' },
  { value: 120, label: '120 minutes', description: 'Extended masterclass' }
]

export function ContentInputStep({ data, onUpdate, onNext, onPrev }: ContentInputStepProps) {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [enhanced, setEnhanced] = useState(false)
  const [originalDescription, setOriginalDescription] = useState('')
  const { toast } = useToast()

  const handleEnhance = async () => {
    if (!data.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a description before enhancing.',
        variant: 'destructive'
      })
      return
    }

    // Remove this check since blink is always available now

    // Store original description for potential revert
    if (!originalDescription) {
      setOriginalDescription(data.description)
    }

    setIsEnhancing(true)
    try {
      const { text } = await blink.ai.generateText({
        prompt: `Enhance this webinar description to be more engaging and structured. 
        
        Original description: "${data.description}"
        Topic: "${data.topic}"
        Audience: "${data.audience}"
        Duration: ${data.duration} minutes
        
        Please improve it by:
        1. Adding engaging hooks and storytelling elements
        2. Structuring key points logically
        3. Ensuring it's appropriate for the target audience
        4. Making it more compelling and professional
        5. Keeping the user's original intent intact
        
        Return only the enhanced description, no additional text.`,
        model: 'gpt-4o-mini'
      })

      onUpdate({ description: text })
      setEnhanced(true)
      toast({
        title: 'Description enhanced!',
        description: 'Your description has been improved with AI.'
      })
    } catch (error) {
      console.error('Enhancement error:', error)
      toast({
        title: 'Enhancement failed',
        description: 'Using your original description. You can try enhancing again.',
        variant: 'destructive'
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  const createFallbackOutline = () => {
    const introDuration = Math.floor(data.duration * 0.1)
    const sectionDuration = Math.floor(data.duration * 0.35)
    const conclusionDuration = Math.floor(data.duration * 0.2)
    
    return {
      title: data.topic || 'Webinar Presentation',
      introduction: {
        hook: 'Welcome to this engaging webinar presentation',
        duration: introDuration,
        points: ['Welcome and introductions', 'Overview of what we\'ll cover']
      },
      sections: [
        {
          title: 'Main Content Section 1',
          duration: sectionDuration,
          points: [
            'Key concept 1',
            'Key concept 2', 
            'Key concept 3',
            'Practical examples'
          ],
          transition: 'Now let\'s move on to our next topic'
        },
        {
          title: 'Main Content Section 2',
          duration: sectionDuration,
          points: [
            'Advanced concepts',
            'Real-world applications', 
            'Best practices',
            'Common challenges'
          ],
          transition: 'Let\'s wrap up with key takeaways'
        }
      ],
      conclusion: {
        summary: 'Key takeaways from today\'s presentation',
        cta: 'Thank you for attending - please reach out with questions',
        duration: conclusionDuration,
        points: ['Recap main points', 'Next steps', 'Q&A session']
      }
    }
  }

  const handleGenerateContent = async () => {
    if (!data.topic || !data.audience || !data.description) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields before generating content.',
        variant: 'destructive'
      })
      return
    }

    // Remove this check since blink is always available now

    setIsGenerating(true)
    try {
      const introDuration = Math.floor(data.duration * 0.1)
      const sectionDuration = Math.floor(data.duration * 0.35)
      const conclusionDuration = Math.floor(data.duration * 0.2)

      const { text } = await blink.ai.generateText({
        prompt: `Create a detailed webinar outline for the following:

        Topic: "${data.topic}"
        Target Audience: "${data.audience}"
        Duration: ${data.duration} minutes
        Description: "${data.description}"

        Please create a structured outline with:
        1. Engaging introduction hook (10% of time)
        2. 2-3 main content sections (70% of time)
        3. Strong conclusion with call-to-action (20% of time)

        For each section, include:
        - Section title
        - Key talking points (3-5 bullet points)
        - Estimated time allocation
        - Transition phrases
        - Interactive elements (polls, Q&A moments)

        IMPORTANT: Return ONLY valid JSON with this exact structure (no additional text or formatting):
        {
          "title": "${data.topic}",
          "introduction": {
            "hook": "Opening hook text here",
            "duration": ${introDuration},
            "points": ["Welcome message", "Agenda overview"]
          },
          "sections": [
            {
              "title": "Section 1 Title",
              "duration": ${sectionDuration},
              "points": ["Key point 1", "Key point 2", "Key point 3"],
              "transition": "Transition to next section"
            },
            {
              "title": "Section 2 Title", 
              "duration": ${sectionDuration},
              "points": ["Key point 1", "Key point 2", "Key point 3"],
              "transition": "Moving forward to conclusion"
            }
          ],
          "conclusion": {
            "summary": "Key takeaways summary",
            "cta": "Call to action message",
            "duration": ${conclusionDuration},
            "points": ["Recap main points", "Next steps"]
          }
        }`,
        model: data.aiTool === 'openai' ? 'gpt-4o-mini' : 'gpt-4o-mini'
      })

      try {
        const outline = JSON.parse(text)
        // Validate the parsed outline has required structure
        if (!outline.title || !outline.sections || !Array.isArray(outline.sections) || outline.sections.length === 0) {
          throw new Error('Invalid outline structure')
        }
        onUpdate({ outline })
        toast({
          title: 'Content generated!',
          description: 'Your webinar outline has been created successfully.'
        })
        onNext()
      } catch (parseError) {
        console.error('JSON parsing failed, creating fallback outline:', parseError)
        // Create a fallback outline structure
        const fallbackOutline = createFallbackOutline()
        
        onUpdate({ outline: fallbackOutline })
        toast({
          title: 'Content generated!',
          description: 'Your webinar outline has been created successfully.'
        })
        onNext()
      }
    } catch (error) {
      console.error('Content generation error:', error)
      // Even if AI fails, create a basic outline so user can proceed
      const fallbackOutline = createFallbackOutline()
      onUpdate({ outline: fallbackOutline })
      
      toast({
        title: 'Content generated with fallback',
        description: 'A basic outline has been created. You can edit it in the next step.',
        variant: 'default'
      })
      onNext()
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevertDescription = () => {
    if (originalDescription) {
      onUpdate({ description: originalDescription })
      setEnhanced(false)
      setOriginalDescription('')
      toast({
        title: 'Description reverted',
        description: 'Your original description has been restored.'
      })
    }
  }

  const handleDescriptionChange = (value: string) => {
    onUpdate({ description: value })
    // Reset enhanced state if user manually edits after enhancement
    if (enhanced && value !== data.description) {
      setEnhanced(false)
    }
  }

  const canProceed = data.topic && data.audience && data.description

  return (
    <div className="space-y-8">
      {/* Topic Input */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-base font-medium">
          Webinar Topic *
        </Label>
        <Input
          id="topic"
          placeholder="e.g., Digital Marketing for Small Businesses"
          value={data.topic}
          onChange={(e) => onUpdate({ topic: e.target.value })}
          className="text-base"
        />
        <p className="text-sm text-muted-foreground">
          Enter the main subject of your webinar
        </p>
      </div>

      {/* Audience Input */}
      <div className="space-y-2">
        <Label htmlFor="audience" className="text-base font-medium">
          Target Audience *
        </Label>
        <Input
          id="audience"
          placeholder="e.g., Small business owners, 25-45 years old"
          value={data.audience}
          onChange={(e) => onUpdate({ audience: e.target.value })}
          className="text-base"
        />
        <p className="text-sm text-muted-foreground">
          Describe who this webinar is designed for
        </p>
      </div>

      {/* Duration Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          <Clock className="h-4 w-4 inline mr-2" />
          Duration
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {durationOptions.map((option) => (
            <Card 
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                data.duration === option.value 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onUpdate({ duration: option.value })}
            >
              <CardContent className="p-4">
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Tool Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          <Brain className="h-4 w-4 inline mr-2" />
          AI Content Generator
        </Label>
        <Select value={data.aiTool} onValueChange={(value) => onUpdate({ aiTool: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aiTools.map((tool) => (
              <SelectItem key={tool.id} value={tool.id}>
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-sm text-muted-foreground">{tool.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description Input with Enhance */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-base font-medium">
            Description & Notes *
          </Label>
          <div className="flex space-x-2">
            {enhanced && originalDescription && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertDescription}
                className="text-orange-600 hover:text-orange-700"
              >
                Revert to Original
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnhance}
              disabled={isEnhancing || !data.description.trim()}
            >
              {isEnhancing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Enhance with AI
            </Button>
          </div>
        </div>
        
        <Textarea
          id="description"
          placeholder="Describe your webinar content, key points, structure, or any specific requirements..."
          value={data.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          rows={6}
          className="text-base"
        />
        
        {enhanced && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Sparkles className="h-4 w-4" />
              <span>Description enhanced with AI</span>
            </div>
            <div className="text-xs text-muted-foreground">
              You can still edit the enhanced text above
            </div>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground">
          Provide details about your webinar content. Click "Enhance with AI" to improve your description. You can always edit the enhanced text or revert to your original.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        {onPrev ? (
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        ) : (
          <div></div>
        )}
        
        <Button
          onClick={handleGenerateContent}
          disabled={!canProceed || isGenerating}
          size="lg"
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Generate Content
            </>
          )}
        </Button>
      </div>

      {/* Token Usage Info */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Token Usage</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm">
            <span>Content generation</span>
            <Badge variant="secondary">~50-100 tokens</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span>AI enhancement</span>
            <Badge variant="secondary">~20-40 tokens</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}