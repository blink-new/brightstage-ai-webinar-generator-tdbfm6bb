import { blink } from '../blink/client'

export interface VoiceOption {
  id: string
  name: string
  gender: 'male' | 'female'
  accent: string
  description: string
  provider: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // ElevenLabs voices
  { id: 'rachel', name: 'Rachel', gender: 'female', accent: 'American', description: 'Professional, warm', provider: 'elevenlabs' },
  { id: 'drew', name: 'Drew', gender: 'male', accent: 'American', description: 'Confident, engaging', provider: 'elevenlabs' },
  { id: 'clyde', name: 'Clyde', gender: 'male', accent: 'American', description: 'Authoritative, clear', provider: 'elevenlabs' },
  { id: 'bella', name: 'Bella', gender: 'female', accent: 'American', description: 'Friendly, approachable', provider: 'elevenlabs' },
  
  // OpenAI voices
  { id: 'alloy', name: 'Alloy', gender: 'female', accent: 'Neutral', description: 'Balanced, professional', provider: 'openai' },
  { id: 'echo', name: 'Echo', gender: 'male', accent: 'Neutral', description: 'Clear, articulate', provider: 'openai' },
  { id: 'fable', name: 'Fable', gender: 'male', accent: 'British', description: 'Sophisticated, engaging', provider: 'openai' },
  { id: 'onyx', name: 'Onyx', gender: 'male', accent: 'American', description: 'Deep, authoritative', provider: 'openai' },
  { id: 'nova', name: 'Nova', gender: 'female', accent: 'American', description: 'Energetic, modern', provider: 'openai' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', accent: 'American', description: 'Warm, conversational', provider: 'openai' },
  
  // Google voices
  { id: 'en-US-Wavenet-A', name: 'Emma', gender: 'female', accent: 'American', description: 'Natural, professional', provider: 'google' },
  { id: 'en-US-Wavenet-B', name: 'James', gender: 'male', accent: 'American', description: 'Confident, clear', provider: 'google' },
  { id: 'en-GB-Wavenet-A', name: 'Oliver', gender: 'male', accent: 'British', description: 'Sophisticated, articulate', provider: 'google' },
  { id: 'en-GB-Wavenet-C', name: 'Sophie', gender: 'female', accent: 'British', description: 'Elegant, professional', provider: 'google' },
  
  // Azure voices
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', accent: 'American', description: 'Expressive, engaging', provider: 'azure' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', accent: 'American', description: 'Professional, reliable', provider: 'azure' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', accent: 'British', description: 'Clear, authoritative', provider: 'azure' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', accent: 'British', description: 'Confident, articulate', provider: 'azure' }
]

class TTSService {
  async generateAudio(
    script: string,
    voiceId: string,
    provider: string = 'openai'
  ): Promise<string> {
    try {
      // For now, we'll use OpenAI's TTS as it's most reliable
      // In production, this would route to different providers based on the provider parameter
      const response = await blink.ai.generateSpeech({
        text: script,
        voice: this.mapVoiceToOpenAI(voiceId),
        model: 'tts-1-hd'
      })

      return response.url
    } catch (error) {
      console.error('Error generating audio:', error)
      throw new Error('Failed to generate audio. Please try again.')
    }
  }

  async generateAudioPreview(
    sampleText: string,
    voiceId: string,
    provider: string = 'openai'
  ): Promise<string> {
    const previewText = sampleText.length > 100 
      ? sampleText.substring(0, 100) + '...'
      : sampleText

    return this.generateAudio(previewText, voiceId, provider)
  }

  getVoicesByProvider(provider: string): VoiceOption[] {
    return VOICE_OPTIONS.filter(voice => voice.provider === provider)
  }

  getVoiceById(voiceId: string): VoiceOption | undefined {
    return VOICE_OPTIONS.find(voice => voice.id === voiceId)
  }

  private mapVoiceToOpenAI(voiceId: string): string {
    // Map other provider voices to OpenAI equivalents for now
    const openAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    
    if (openAIVoices.includes(voiceId)) {
      return voiceId
    }

    // Default mappings based on characteristics
    const voice = this.getVoiceById(voiceId)
    if (!voice) return 'alloy'

    if (voice.gender === 'male') {
      if (voice.accent === 'British') return 'fable'
      return voice.description.includes('deep') ? 'onyx' : 'echo'
    } else {
      if (voice.description.includes('energetic')) return 'nova'
      if (voice.description.includes('warm')) return 'shimmer'
      return 'alloy'
    }
  }

  estimateAudioDuration(text: string): number {
    // Rough estimate: average speaking rate is ~150 words per minute
    const wordCount = text.split(/\s+/).length
    return Math.ceil((wordCount / 150) * 60) // Return seconds
  }

  splitScriptForProcessing(script: string, maxChunkSize: number = 4000): string[] {
    // Split long scripts into chunks for processing
    if (script.length <= maxChunkSize) {
      return [script]
    }

    const chunks: string[] = []
    const sentences = script.split(/[.!?]+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += sentence + '. '
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }
}

export const ttsService = new TTSService()