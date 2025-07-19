import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'default' | 'white' | 'dark'
  className?: string
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8', 
  lg: 'h-12',
  xl: 'h-16'
}

export function Logo({ 
  size = 'md', 
  showText = true, 
  variant = 'default',
  className 
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img 
        src="/brightstage-logo.png" 
        alt="BrightStage AI" 
        className={cn(sizeClasses[size], 'w-auto object-contain')}
      />
      {showText && (
        <span className={cn(
          'font-semibold tracking-tight',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-xl',
          size === 'xl' && 'text-2xl',
          variant === 'white' && 'text-white',
          variant === 'dark' && 'text-slate-900',
          variant === 'default' && 'text-slate-900'
        )}>
          BrightStage AI
        </span>
      )}
    </div>
  )
}