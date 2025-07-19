import { createClient } from '@blinkdotnew/sdk'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://qvqpzuokvpnolgddfdko.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cXB6dW9rdnBub2xnZGRmZGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzAwMTYsImV4cCI6MjA2ODM0NjAxNn0.DuaKyzt7NFtfct421PVv8BKkXDNsNgHN6jF2oPQl-dY'

// Create Supabase client first
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Create Blink client with error handling
let blinkClient: ReturnType<typeof createClient> | null = null

try {
  blinkClient = createClient({
    projectId: 'brightstage-ai-webinar-generator-tdbfm6bb',
    authRequired: true
  })

  // Disable analytics if it's causing issues
  if (blinkClient?.analytics?.disable) {
    try {
      blinkClient.analytics.disable()
      console.log('Blink analytics disabled to prevent network errors')
    } catch (analyticsError) {
      console.warn('Failed to disable Blink analytics:', analyticsError)
    }
  }
} catch (error) {
  console.error('Failed to initialize Blink client:', error)
}

export const blink = blinkClient!

// Database helper functions using Supabase
export const db = {
  users: {
    async list(options: any = {}) {
      try {
        let query = supabase.from('users').select('*')
        
        if (options.where?.id) {
          query = query.eq('id', options.where.id)
        }
        
        if (options.limit) {
          query = query.limit(options.limit)
        } else {
          query = query.limit(100)
        }
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 10000)
        )
        
        const { data, error } = await Promise.race([query, timeoutPromise]) as any
        
        if (error) {
          console.error('Database error in users.list:', error)
          throw error
        }
        return data || []
      } catch (error) {
        console.error('Failed to list users:', error)
        throw error
      }
    },
    
    async create(userData: any) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            id: userData.id,
            email: userData.email,
            display_name: userData.displayName,
            avatar_url: userData.avatarUrl,
            tokens_balance: userData.tokensBalance,
            preferred_ai_provider: userData.preferredAiProvider,
            preferred_tts_provider: userData.preferredTtsProvider
          }])
          .select()
          .single()
        
        if (error) {
          console.error('Database error in users.create:', error)
          throw error
        }
        return {
          id: data.id,
          email: data.email,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          tokensBalance: data.tokens_balance,
          preferredAiProvider: data.preferred_ai_provider,
          preferredTtsProvider: data.preferred_tts_provider
        }
      } catch (error) {
        console.error('Failed to create user:', error)
        throw error
      }
    },
    
    async update(id: string, updates: any) {
      const { data, error } = await supabase
        .from('users')
        .update({
          display_name: updates.displayName,
          avatar_url: updates.avatarUrl,
          tokens_balance: updates.tokensBalance,
          preferred_ai_provider: updates.preferredAiProvider,
          preferred_tts_provider: updates.preferredTtsProvider,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  },
  
  webinarProjects: {
    async list(options: any = {}) {
      let query = supabase.from('webinar_projects').select('*')
      
      if (options.where?.userId) {
        query = query.eq('user_id', options.where.userId)
      }
      
      if (options.orderBy?.createdAt) {
        query = query.order('created_at', { ascending: options.orderBy.createdAt === 'asc' })
      }
      
      if (options.limit) {
        query = query.limit(options.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return (data || []).map((project: any) => ({
        id: project.id,
        userId: project.user_id,
        title: project.title,
        topic: project.topic,
        targetAudience: project.target_audience,
        durationMinutes: project.duration_minutes,
        description: project.description,
        aiTool: project.ai_tool,
        status: project.status,
        generationProgress: project.generation_progress,
        tokensUsed: project.tokens_used,
        outline: project.outline,
        template: project.template,
        slides: project.slides,
        voiceStyle: project.voice_style,
        ttsProvider: project.tts_provider,
        script: project.script,
        videoUrl: project.video_url,
        exportUrls: project.export_urls,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }))
    },
    
    async create(projectData: any) {
      const { data, error } = await supabase
        .from('webinar_projects')
        .insert([{
          id: projectData.id,
          user_id: projectData.userId,
          title: projectData.title,
          topic: projectData.topic,
          target_audience: projectData.targetAudience,
          duration_minutes: projectData.durationMinutes,
          description: projectData.description,
          ai_tool: projectData.aiTool,
          status: projectData.status,
          generation_progress: projectData.generationProgress,
          tokens_used: projectData.tokensUsed,
          outline: projectData.outline,
          template: projectData.template,
          slides: projectData.slides,
          voice_style: projectData.voiceStyle,
          tts_provider: projectData.ttsProvider,
          script: projectData.script,
          video_url: projectData.videoUrl,
          export_urls: projectData.exportUrls
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async update(id: string, updates: any) {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.topic !== undefined) updateData.topic = updates.topic
      if (updates.targetAudience !== undefined) updateData.target_audience = updates.targetAudience
      if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.aiTool !== undefined) updateData.ai_tool = updates.aiTool
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.generationProgress !== undefined) updateData.generation_progress = updates.generationProgress
      if (updates.tokensUsed !== undefined) updateData.tokens_used = updates.tokensUsed
      if (updates.outline !== undefined) updateData.outline = updates.outline
      if (updates.template !== undefined) updateData.template = updates.template
      if (updates.slides !== undefined) updateData.slides = updates.slides
      if (updates.voiceStyle !== undefined) updateData.voice_style = updates.voiceStyle
      if (updates.ttsProvider !== undefined) updateData.tts_provider = updates.ttsProvider
      if (updates.script !== undefined) updateData.script = updates.script
      if (updates.videoUrl !== undefined) updateData.video_url = updates.videoUrl
      if (updates.exportUrls !== undefined) updateData.export_urls = updates.exportUrls
      
      const { data, error } = await supabase
        .from('webinar_projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('webinar_projects')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    }
  },
  
  tokenTransactions: {
    async create(transactionData: any) {
      const { data, error } = await supabase
        .from('token_transactions')
        .insert([{
          id: transactionData.id,
          user_id: transactionData.userId,
          project_id: transactionData.projectId,
          transaction_type: transactionData.transactionType,
          tokens_amount: transactionData.tokensAmount,
          description: transactionData.description
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async list(options: any = {}) {
      let query = supabase.from('token_transactions').select('*')
      
      if (options.where?.userId) {
        query = query.eq('user_id', options.where.userId)
      }
      
      if (options.orderBy?.createdAt) {
        query = query.order('created_at', { ascending: options.orderBy.createdAt === 'asc' })
      }
      
      if (options.limit) {
        query = query.limit(options.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    }
  }
}