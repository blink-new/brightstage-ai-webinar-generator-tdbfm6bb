import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-auto',
  md: 'h-12 w-auto', 
  lg: 'h-16 w-auto',
  xl: 'h-20 w-auto'
}

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <img
      src="/bslogo.png"
      alt="BrightStage AI"
      className={cn(sizeClasses[size], 'object-contain', className)}
    />
  )
}