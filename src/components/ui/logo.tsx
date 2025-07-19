import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8', 
  lg: 'h-10 w-10',
  xl: 'h-12 w-12'
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