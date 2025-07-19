import { blink } from '../blink/client'

export interface WebinarOutline {
  title: string
  introduction: {
    hook: string
    overview: string[]
    duration: number
  }
  sections: {
    title: string
    keyPoints: string[]
    duration: number
    transitionPhrase: string
  }[]
  conclusion: {
    summary: string[]
    callToAction: string
    duration: number
  }
  interactiveElements: {
    type: 'poll' | 'quiz' | 'qa'
    timing: number
    content: string
  }[]
  totalDuration: number
}

export interface SlideContent {
  id: string
  type: 'title' | 'content' | 'transition' | 'cta'
  title: string
  content: string[]
  speakerNotes: string
  imagePrompt?: string
  imageUrl?: string
  duration: number
}

export interface AIProvider {
  id: string
  name: string
  description: string
  costMultiplier: number
}

export const AI_PROVIDERS: AIProvider[] = [
  { id: 'openai', name: 'OpenAI GPT-4', description: 'Best for creative content', costMultiplier: 1.0 },
  { id: 'claude', name: 'Anthropic Claude', description: 'Excellent for structured content', costMultiplier: 1.2 },
  { id: 'gemini', name: 'Google Gemini', description: 'Great for research-heavy topics', costMultiplier: 0.8 },
  { id: 'grok', name: 'xAI Grok', description: 'Perfect for engaging presentations', costMultiplier: 1.1 }
]

export const TTS_PROVIDERS: AIProvider[] = [
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Premium voice quality', costMultiplier: 2.0 },
  { id: 'openai', name: 'OpenAI TTS', description: 'Natural sounding voices', costMultiplier: 1.0 },
  { id: 'google', name: 'Google Cloud TTS', description: 'Reliable and fast', costMultiplier: 0.6 },
  { id: 'azure', name: 'Microsoft Azure', description: 'Professional voices', costMultiplier: 0.8 }
]

class AIService {
  async enhanceDescription(
    description: string, 
    topic: string, 
    audience: string,
    provider: string = 'openai'
  ): Promise<string> {
    const prompt = `Enhance this webinar description to be more engaging and structured:

Topic: ${topic}
Target Audience: ${audience}
Current Description: ${description}

Please improve it by:
1. Adding compelling hooks and storytelling elements
2. Ensuring logical flow and completeness
3. Making it audience-specific and engaging
4. Suggesting key points that would resonate
5. Keeping the user's original intent intact

Return only the enhanced description, no additional formatting.`

    try {
      const response = await blink.ai.generateText({
        prompt,
        model: this.getModelForProvider(provider),
        maxTokens: 500
      })

      return response.text.trim()
    } catch (error) {
      console.error('Error enhancing description:', error)
      // Return original description if enhancement fails
      return description
    }
  }

  async generateOutline(
    topic: string,
    audience: string,
    duration: number,
    enhancedDescription: string,
    provider: string = 'openai'
  ): Promise<WebinarOutline> {
    const prompt = `Create a detailed webinar outline for:

Topic: ${topic}
Target Audience: ${audience}
Duration: ${duration} minutes
Description: ${enhancedDescription}

Generate a JSON response with this exact structure:
{
  "title": "Engaging webinar title",
  "introduction": {
    "hook": "Compelling opening hook",
    "overview": ["Key point 1", "Key point 2", "Key point 3"],
    "duration": 5
  },
  "sections": [
    {
      "title": "Section title",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "duration": 15,
      "transitionPhrase": "Smooth transition to next section"
    }
  ],
  "conclusion": {
    "summary": ["Key takeaway 1", "Key takeaway 2"],
    "callToAction": "Clear next step for audience",
    "duration": 10
  },
  "interactiveElements": [
    {
      "type": "poll",
      "timing": 20,
      "content": "Poll question"
    }
  ],
  "totalDuration": ${duration}
}

Ensure the sections add up to the total duration. Include 3-5 main sections with engaging content.`

    try {
      const response = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            introduction: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                overview: { type: 'array', items: { type: 'string' } },
                duration: { type: 'number' }
              },
              required: ['hook', 'overview', 'duration']
            },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  keyPoints: { type: 'array', items: { type: 'string' } },
                  duration: { type: 'number' },
                  transitionPhrase: { type: 'string' }
                },
                required: ['title', 'keyPoints', 'duration', 'transitionPhrase']
              }
            },
            conclusion: {
              type: 'object',
              properties: {
                summary: { type: 'array', items: { type: 'string' } },
                callToAction: { type: 'string' },
                duration: { type: 'number' }
              },
              required: ['summary', 'callToAction', 'duration']
            },
            interactiveElements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['poll', 'quiz', 'qa'] },
                  timing: { type: 'number' },
                  content: { type: 'string' }
                },
                required: ['type', 'timing', 'content']
              }
            },
            totalDuration: { type: 'number' }
          },
          required: ['title', 'introduction', 'sections', 'conclusion', 'interactiveElements', 'totalDuration']
        }
      })

      return response.object as WebinarOutline
    } catch (error) {
      console.error('Error generating outline:', error)
      throw new Error('Failed to generate webinar outline. Please try again.')
    }
  }

  async generateSlides(
    outline: WebinarOutline,
    template: string,
    provider: string = 'openai'
  ): Promise<SlideContent[]> {
    const prompt = `Convert this webinar outline into detailed slide content:

${JSON.stringify(outline, null, 2)}

Template Style: ${template}

Generate slides with this structure for each slide:
- Title slide
- Introduction slides (hook + overview)
- Content slides (1-2 slides per section)
- Transition slides between sections
- Conclusion slides
- Call-to-action slide

For each slide, provide:
1. Clear, concise title
2. Bullet points (max 5 per slide)
3. Detailed speaker notes for narration
4. Image prompt for visual content
5. Estimated speaking duration

Return as JSON array of slide objects.`

    try {
      const response = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['title', 'content', 'transition', 'cta'] },
                  title: { type: 'string' },
                  content: { type: 'array', items: { type: 'string' } },
                  speakerNotes: { type: 'string' },
                  imagePrompt: { type: 'string' },
                  duration: { type: 'number' }
                },
                required: ['id', 'type', 'title', 'content', 'speakerNotes', 'duration']
              }
            }
          },
          required: ['slides']
        }
      })

      return (response.object as { slides: SlideContent[] }).slides
    } catch (error) {
      console.error('Error generating slides:', error)
      throw new Error('Failed to generate slides. Please try again.')
    }
  }

  async generateScript(slides: SlideContent[]): Promise<string> {
    const prompt = `Convert these slide speaker notes into a natural, flowing webinar script:

${slides.map((slide, index) => `
Slide ${index + 1}: ${slide.title}
Speaker Notes: ${slide.speakerNotes}
Duration: ${slide.duration} minutes
`).join('\n')}

Create a natural, conversational script that:
1. Flows smoothly between slides
2. Includes natural pauses and emphasis
3. Sounds like a real presenter speaking
4. Maintains engagement throughout
5. Includes timing cues for slide transitions

Format as a single continuous script with [SLIDE X] markers for transitions.`

    try {
      const response = await blink.ai.generateText({
        prompt,
        maxTokens: 2000
      })

      return response.text.trim()
    } catch (error) {
      console.error('Error generating script:', error)
      throw new Error('Failed to generate script. Please try again.')
    }
  }

  private getModelForProvider(provider: string): string {
    switch (provider) {
      case 'openai': return 'gpt-4o-mini'
      case 'claude': return 'claude-3-sonnet-20240229'
      case 'gemini': return 'gemini-pro'
      case 'grok': return 'grok-beta'
      default: return 'gpt-4o-mini'
    }
  }

  getTokenCost(provider: string, operation: 'content' | 'slides' | 'voice' | 'video'): number {
    const baseCosts = {
      content: 10,
      slides: 15,
      voice: 20,
      video: 25
    }

    const providerMultiplier = AI_PROVIDERS.find(p => p.id === provider)?.costMultiplier || 1.0
    return Math.ceil(baseCosts[operation] * providerMultiplier)
  }
}

export const aiService = new AIService()