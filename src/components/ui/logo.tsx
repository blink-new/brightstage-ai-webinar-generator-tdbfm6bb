import { cn } from '../../lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'default' | 'white' | 'dark'
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8', 
  lg: 'w-10 h-10',
  xl: 'w-12 h-12'
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
}

export function Logo({ className, size = 'md', showText = true, variant = 'default' }: LogoProps) {
  const logoClasses = cn(sizeClasses[size], className)
  const textClasses = cn(
    'font-bold ml-2',
    textSizeClasses[size],
    variant === 'white' ? 'text-white' : variant === 'dark' ? 'text-gray-900' : 'text-primary'
  )

  return (
    <div className="flex items-center">
      <div className={logoClasses}>
        <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`logoGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: variant === 'white' ? '#ffffff' : '#6366F1', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: variant === 'white' ? '#f8fafc' : '#8B5CF6', stopOpacity: 1}} />
            </linearGradient>
            <linearGradient id={`sparkleGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#F59E0B', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#FBBF24', stopOpacity: 1}} />
            </linearGradient>
          </defs>
          
          {/* Main circle background */}
          <circle 
            cx="20" 
            cy="20" 
            r="18" 
            fill={`url(#logoGradient-${variant})`} 
            stroke={variant === 'dark' ? '#1f2937' : 'white'} 
            strokeWidth="2"
          />
          
          {/* Stage/Platform base */}
          <rect 
            x="8" 
            y="26" 
            width="24" 
            height="3" 
            rx="1.5" 
            fill={variant === 'white' ? '#1f2937' : 'white'} 
            opacity="0.9"
          />
          
          {/* Spotlight/Stage light */}
          <ellipse 
            cx="20" 
            cy="15" 
            rx="8" 
            ry="6" 
            fill={variant === 'white' ? '#1f2937' : 'white'} 
            opacity="0.2"
          />
          <ellipse 
            cx="20" 
            cy="15" 
            rx="5" 
            ry="4" 
            fill={variant === 'white' ? '#1f2937' : 'white'} 
            opacity="0.3"
          />
          
          {/* AI Sparkle/Star in center */}
          <g transform="translate(20, 15)">
            <path 
              d="M0,-4 L1.2,-1.2 L4,0 L1.2,1.2 L0,4 L-1.2,1.2 L-4,0 L-1.2,-1.2 Z" 
              fill={`url(#sparkleGradient-${variant})`}
            />
            <circle cx="6" cy="-2" r="1" fill={`url(#sparkleGradient-${variant})`} opacity="0.8"/>
            <circle cx="-5" cy="3" r="0.8" fill={`url(#sparkleGradient-${variant})`} opacity="0.6"/>
            <circle cx="3" cy="5" r="0.6" fill={`url(#sparkleGradient-${variant})`} opacity="0.7"/>
          </g>
        </svg>
      </div>
      
      {showText && (
        <span className={textClasses}>
          BrightStage AI
        </span>
      )}
    </div>
  )
}

export default Logo