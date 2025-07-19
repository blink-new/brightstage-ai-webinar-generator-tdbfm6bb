import { useState, useEffect } from 'react'
import { blink, db } from '../blink/client'

interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  tokensBalance: number
  preferredAiProvider: string
  preferredTtsProvider: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT TOP LEVEL
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  })

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    let mounted = true

    const initAuth = async () => {
      try {
        // Safe check for blink client availability
        const blinkClient = blink
        if (!blinkClient) {
          console.error('Blink client not initialized')
          if (mounted) {
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false
            })
          }
          return
        }

        // Wait for blink client to be ready with timeout
        const client = await Promise.race([
          Promise.resolve(blink),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Blink client timeout')), 10000)
          )
        ]) as typeof blink
        
        if (!mounted || !client) return
        
        unsubscribe = client.auth.onAuthStateChanged(async (state: any) => {
          if (!mounted) return
          if (state.isLoading) {
            setAuthState(prev => ({ ...prev, isLoading: true }))
            return
          }

          if (!state.user) {
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false
            })
            return
          }

          try {
            // Get or create user record in Supabase
            const users = await db.users.list({
              where: { id: state.user.id },
              limit: 1
            })

            let user: User
            if (users.length === 0) {
              // Create new user record with retry logic
              try {
                const newUser = await db.users.create({
                  id: state.user.id,
                  email: state.user.email || '',
                  displayName: state.user.displayName || state.user.email?.split('@')[0] || 'User',
                  avatarUrl: state.user.avatarUrl || null,
                  tokensBalance: 100, // Free tier tokens
                  preferredAiProvider: 'openai',
                  preferredTtsProvider: 'elevenlabs'
                })
                user = newUser
              } catch (createError) {
                console.warn('Failed to create user record, using fallback:', createError)
                // Use fallback user data if database creation fails
                user = {
                  id: state.user.id,
                  email: state.user.email || '',
                  displayName: state.user.displayName || state.user.email?.split('@')[0] || 'User',
                  avatarUrl: state.user.avatarUrl,
                  tokensBalance: 100,
                  preferredAiProvider: 'openai',
                  preferredTtsProvider: 'elevenlabs'
                }
              }
            } else {
              const dbUser = users[0]
              user = {
                id: dbUser.id,
                email: dbUser.email,
                displayName: dbUser.displayName || undefined,
                avatarUrl: dbUser.avatarUrl || undefined,
                tokensBalance: Number(dbUser.tokensBalance) || 100,
                preferredAiProvider: dbUser.preferredAiProvider || 'openai',
                preferredTtsProvider: dbUser.preferredTtsProvider || 'elevenlabs'
              }
            }

            setAuthState({
              user,
              isLoading: false,
              isAuthenticated: true
            })
          } catch (error) {
            console.error('Error loading user data:', error)
            // Still set the user as authenticated even if DB fails
            setAuthState({
              user: {
                id: state.user.id,
                email: state.user.email || '',
                displayName: state.user.displayName || state.user.email?.split('@')[0] || 'User',
                avatarUrl: state.user.avatarUrl,
                tokensBalance: 100,
                preferredAiProvider: 'openai',
                preferredTtsProvider: 'elevenlabs'
              },
              isLoading: false,
              isAuthenticated: true
            })
          }
        })
      } catch (error) {
        console.error('Auth initialization failed:', error)
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false
        })
      }
    }

    initAuth()

    return () => {
      mounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  const updateTokenBalance = async (newBalance: number) => {
    if (!authState.user) return

    try {
      await db.users.update(authState.user.id, {
        tokensBalance: newBalance
      })

      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, tokensBalance: newBalance } : null
      }))
    } catch (error) {
      console.error('Error updating token balance:', error)
      // Update local state even if DB update fails
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, tokensBalance: newBalance } : null
      }))
    }
  }

  const consumeTokens = async (amount: number, description: string, projectId?: string) => {
    if (!authState.user) throw new Error('User not authenticated')
    
    const currentBalance = authState.user.tokensBalance
    if (currentBalance < amount) {
      throw new Error('Insufficient tokens')
    }

    const newBalance = currentBalance - amount

    try {
      // Update user balance
      await updateTokenBalance(newBalance)

      // Record transaction
      try {
        await db.tokenTransactions.create({
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: authState.user.id,
          projectId: projectId || null,
          transactionType: 'usage',
          tokensAmount: -amount,
          description
        })
      } catch (error) {
        console.warn('Failed to record token transaction:', error)
        // Don't fail the whole operation if transaction recording fails
      }

      return newBalance
    } catch (error) {
      console.error('Error consuming tokens:', error)
      throw error
    }
  }

  const login = () => {
    try {
      if (!blink) {
        console.error('Blink client not available for login')
        window.location.href = 'https://blink.new/auth'
        return
      }
      blink.auth.login()
    } catch (error) {
      console.error('Login failed:', error)
      // Fallback to direct redirect
      window.location.href = 'https://blink.new/auth'
    }
  }

  const logout = () => {
    try {
      if (!blink) {
        console.error('Blink client not available for logout')
        window.location.reload()
        return
      }
      blink.auth.logout()
    } catch (error) {
      console.error('Logout failed:', error)
      // Fallback to page reload
      window.location.reload()
    }
  }

  return {
    ...authState,
    updateTokenBalance,
    consumeTokens,
    login,
    logout
  }
}