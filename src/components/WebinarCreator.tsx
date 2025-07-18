import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, Save } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { ContentInputStep } from './steps/ContentInputStep'
import { SlideDesignStep } from './steps/SlideDesignStep'
import { VoiceVideoStep } from './steps/VoiceVideoStep'
import { ExportStep } from './steps/ExportStep'
import { useWebinarProject } from '../hooks/useWebinarProject'
import { useToast } from '../hooks/use-toast'

interface User {
  id: string
  email: string
  displayName?: string
}

interface WebinarCreatorProps {
  user: User
  onBack: () => void
  editingWebinarId?: string
}

export interface WebinarData {
  topic: string
  audience: string
  duration: number
  description: string
  aiTool: string
  outline?: any
  template?: string
  slides?: any[]
  voiceStyle?: string
  ttsProvider?: string
  script?: string
  videoUrl?: string
  pitchVideoUrl?: string
}

const steps = [
  { id: 1, title: 'Content Input', description: 'Define your webinar topic and audience' },
  { id: 2, title: 'Slide Design', description: 'Create professional slides with templates' },
  { id: 3, title: 'Voice & Video', description: 'Generate narration and video output' },
  { id: 4, title: 'Export & Share', description: 'Download and share your webinar' }
]

function WebinarCreator({ user, onBack, editingWebinarId }: WebinarCreatorProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [webinarData, setWebinarData] = useState<WebinarData>({
    topic: '',
    audience: '',
    duration: 60,
    description: '',
    aiTool: 'openai'
  })
  const [currentWebinarId, setCurrentWebinarId] = useState<string | undefined>(editingWebinarId)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  const { createProject, updateProject, getProject } = useWebinarProject(user.id)
  const { toast } = useToast()

  // Load existing webinar if editing
  useEffect(() => {
    if (editingWebinarId) {
      const existingWebinar = getProject(editingWebinarId)
      if (existingWebinar) {
        setWebinarData({
          topic: existingWebinar.topic,
          audience: existingWebinar.targetAudience,
          duration: existingWebinar.durationMinutes,
          description: existingWebinar.description,
          aiTool: existingWebinar.aiTool,
          outline: existingWebinar.outline,
          template: existingWebinar.template,
          slides: existingWebinar.slides,
          voiceStyle: existingWebinar.voiceStyle,
          ttsProvider: existingWebinar.ttsProvider,
          script: existingWebinar.script,
          videoUrl: existingWebinar.videoUrl
        })
        setCurrentWebinarId(editingWebinarId)
        // Determine current step based on progress
        if (existingWebinar.videoUrl) {
          setCurrentStep(4)
        } else if (existingWebinar.script) {
          setCurrentStep(3)
        } else if (existingWebinar.slides) {
          setCurrentStep(2)
        } else {
          setCurrentStep(1)
        }
      }
    }
  }, [editingWebinarId, getProject])

  const handleSave = useCallback(async (silent = false) => {
    try {
      if (currentWebinarId) {
        // Update existing project
        await updateProject(currentWebinarId, {
          title: webinarData.topic || 'Untitled Webinar',
          topic: webinarData.topic,
          targetAudience: webinarData.audience,
          durationMinutes: webinarData.duration,
          description: webinarData.description,
          aiTool: webinarData.aiTool,
          outline: webinarData.outline,
          template: webinarData.template,
          slides: webinarData.slides,
          voiceStyle: webinarData.voiceStyle,
          ttsProvider: webinarData.ttsProvider,
          script: webinarData.script,
          videoUrl: webinarData.videoUrl
        })
      } else {
        // Create new project
        const newProject = await createProject({
          title: webinarData.topic || 'Untitled Webinar',
          topic: webinarData.topic,
          targetAudience: webinarData.audience,
          durationMinutes: webinarData.duration,
          description: webinarData.description,
          aiTool: webinarData.aiTool,
          outline: webinarData.outline,
          template: webinarData.template,
          slides: webinarData.slides,
          voiceStyle: webinarData.voiceStyle,
          ttsProvider: webinarData.ttsProvider,
          script: webinarData.script,
          videoUrl: webinarData.videoUrl
        })
        setCurrentWebinarId(newProject.id)
      }
      
      setLastSaved(new Date())
      
      if (!silent) {
        toast({
          title: 'Webinar saved',
          description: 'Your progress has been saved successfully.'
        })
      }
    } catch (error) {
      console.error('Save error:', error)
      if (!silent) {
        toast({
          title: 'Save failed',
          description: 'Unable to save your webinar. Please try again.',
          variant: 'destructive'
        })
      }
    }
  }, [webinarData, currentWebinarId, createProject, updateProject, toast])

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (webinarData.topic || webinarData.description) {
        handleSave(true) // Silent save
      }
    }, 30000)

    return () => clearInterval(autoSaveInterval)
  }, [webinarData, handleSave])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            setCurrentStep(prev => prev > 1 ? prev - 1 : prev)
            break
          case 'ArrowRight':
            event.preventDefault()
            setCurrentStep(prev => prev < steps.length ? prev + 1 : prev)
            break
          case 's':
            event.preventDefault()
            handleSave()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const updateWebinarData = (updates: Partial<WebinarData>) => {
    setWebinarData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev < steps.length ? prev + 1 : prev)
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => prev > 1 ? prev - 1 : prev)
  }, [])

  const goToStep = useCallback(async (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= steps.length) {
      // Allow going to any previous step or next step if content exists
      if (stepNumber <= currentStep || (stepNumber === 2 && webinarData.outline) || (stepNumber === 3 && webinarData.slides) || (stepNumber === 4 && webinarData.videoUrl)) {
        setCurrentStep(stepNumber)
        // Auto-save when navigating
        if (webinarData.topic || webinarData.description) {
          try {
            await handleSave(true)
          } catch (error) {
            console.warn('Auto-save failed during navigation:', error)
          }
        }
      }
    }
  }, [currentStep, webinarData, handleSave])

  const progress = (currentStep / steps.length) * 100

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ContentInputStep
            data={webinarData}
            onUpdate={updateWebinarData}
            onNext={nextStep}
            onPrev={onBack}
          />
        )
      case 2:
        return (
          <SlideDesignStep
            data={webinarData}
            onUpdate={updateWebinarData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        return (
          <VoiceVideoStep
            data={webinarData}
            onUpdate={updateWebinarData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 4:
        return (
          <ExportStep
            data={webinarData}
            onUpdate={updateWebinarData}
            onPrev={prevStep}
            onComplete={onBack}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">BS</span>
                </div>
                <span className="text-lg font-bold text-primary">BrightStage AI</span>
              </div>
              <div className="h-6 w-px bg-border"></div>
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border"></div>
              <h1 className="text-xl font-semibold">
                {editingWebinarId ? 'Edit Webinar' : 'Create New Webinar'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-save indicator */}
              {lastSaved && (
                <div className="text-xs text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              
              {/* Manual save button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave()}
                disabled={!webinarData.topic && !webinarData.description}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
              </div>
              
              {/* Navigation hint */}
              <div className="hidden lg:block text-xs text-muted-foreground">
                Use Ctrl+← → to navigate
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((step) => {
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              const canNavigate = step.id <= currentStep || 
                (step.id === 2 && webinarData.outline) || 
                (step.id === 3 && webinarData.slides) || 
                (step.id === 4 && webinarData.videoUrl)
              
              return (
                <div key={step.id} className="flex items-center space-x-2">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={!canNavigate}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      transition-all hover:scale-105 disabled:cursor-not-allowed
                      ${isCompleted
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm' 
                        : isCurrent 
                        ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20' 
                        : canNavigate
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                      }
                    `}
                    title={canNavigate ? `Go to ${step.title}` : `Complete previous steps to unlock ${step.title}`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </button>
                  <div className="hidden sm:block">
                    <button
                      onClick={() => goToStep(step.id)}
                      disabled={!canNavigate}
                      className="text-left disabled:cursor-not-allowed group"
                      title={canNavigate ? `Go to ${step.title}` : `Complete previous steps to unlock ${step.title}`}
                    >
                      <div className={`text-sm font-medium transition-colors ${
                        isCurrent 
                          ? 'text-primary' 
                          : isCompleted 
                          ? 'text-green-600 group-hover:text-green-700' 
                          : canNavigate 
                          ? 'text-foreground group-hover:text-primary' 
                          : 'text-muted-foreground/50'
                      }`}>
                        {step.title}
                        {isCompleted && <span className="ml-1 text-green-600">✓</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default WebinarCreator