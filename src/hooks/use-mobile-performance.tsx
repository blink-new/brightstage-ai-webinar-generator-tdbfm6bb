import { useState, useEffect } from 'react'

interface MobilePerformanceConfig {
  isMobile: boolean
  isLowEndDevice: boolean
  maxChunkSize: number
  maxResolution: '720p' | '1080p' | '4k'
  enableFallbacks: boolean
  memoryLimit: number // MB
}

interface DeviceCapabilities {
  memory?: number // GB
  cores?: number
  gpu?: string
  userAgent: string
}

export function useMobilePerformance(): MobilePerformanceConfig {
  const [config, setConfig] = useState<MobilePerformanceConfig>({
    isMobile: false,
    isLowEndDevice: false,
    maxChunkSize: 1000,
    maxResolution: '1080p',
    enableFallbacks: false,
    memoryLimit: 512
  })

  useEffect(() => {
    const detectDeviceCapabilities = (): DeviceCapabilities => {
      const nav = navigator as any
      return {
        memory: nav.deviceMemory, // GB
        cores: nav.hardwareConcurrency,
        gpu: getGPUInfo(),
        userAgent: nav.userAgent
      }
    }

    const getGPUInfo = (): string => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
          if (debugInfo) {
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown'
          }
        }
      } catch (error) {
        console.warn('Could not detect GPU info:', error)
      }
      return 'Unknown'
    }

    const isMobileDevice = (): boolean => {
      // Check multiple indicators for mobile
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']
      const hasMobileKeyword = mobileKeywords.some(keyword => userAgent.includes(keyword))
      
      // Check screen size
      const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 768
      
      // Check touch capability
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      return hasMobileKeyword || (isSmallScreen && hasTouch)
    }

    const isLowEndDevice = (capabilities: DeviceCapabilities): boolean => {
      // Detect low-end devices based on multiple factors
      const lowMemory = capabilities.memory && capabilities.memory <= 2 // 2GB or less
      const fewCores = capabilities.cores && capabilities.cores <= 2 // 2 cores or less
      const oldDevice = isOldDevice(capabilities.userAgent)
      const integratedGPU = isIntegratedGPU(capabilities.gpu)
      
      return !!(lowMemory || fewCores || oldDevice || integratedGPU)
    }

    const isOldDevice = (userAgent: string): boolean => {
      // Check for older iOS/Android versions
      const iosMatch = userAgent.match(/OS (\d+)_/)
      if (iosMatch && parseInt(iosMatch[1]) < 13) return true // iOS < 13
      
      const androidMatch = userAgent.match(/Android (\d+)/)
      if (androidMatch && parseInt(androidMatch[1]) < 8) return true // Android < 8
      
      return false
    }

    const isIntegratedGPU = (gpu: string): boolean => {
      const integratedKeywords = ['intel', 'integrated', 'mali', 'adreno 3', 'adreno 4']
      return integratedKeywords.some(keyword => gpu.toLowerCase().includes(keyword))
    }

    const calculateOptimalSettings = (
      isMobile: boolean, 
      isLowEnd: boolean, 
      capabilities: DeviceCapabilities
    ): MobilePerformanceConfig => {
      if (isLowEnd || isMobile) {
        return {
          isMobile,
          isLowEndDevice: isLowEnd,
          maxChunkSize: isLowEnd ? 200 : 500, // Smaller chunks for low-end devices
          maxResolution: isLowEnd ? '720p' : '1080p', // Limit resolution
          enableFallbacks: true,
          memoryLimit: isLowEnd ? 256 : 512 // MB
        }
      }

      // Desktop/high-end device settings
      return {
        isMobile: false,
        isLowEndDevice: false,
        maxChunkSize: 1000,
        maxResolution: '4k',
        enableFallbacks: false,
        memoryLimit: 1024
      }
    }

    // Detect device capabilities
    const capabilities = detectDeviceCapabilities()
    const isMobile = isMobileDevice()
    const isLowEnd = isLowEndDevice(capabilities)
    
    console.log('Device capabilities detected:', {
      isMobile,
      isLowEnd,
      memory: capabilities.memory,
      cores: capabilities.cores,
      gpu: capabilities.gpu
    })

    const optimalConfig = calculateOptimalSettings(isMobile, isLowEnd, capabilities)
    setConfig(optimalConfig)

    // Listen for orientation/resize changes on mobile
    if (isMobile) {
      const handleResize = () => {
        // Re-evaluate on orientation change
        const newIsMobile = isMobileDevice()
        if (newIsMobile !== optimalConfig.isMobile) {
          const newConfig = calculateOptimalSettings(newIsMobile, isLowEnd, capabilities)
          setConfig(newConfig)
        }
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('orientationchange', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('orientationchange', handleResize)
      }
    }
  }, []) // Empty dependency array is correct here as we want this to run only once

  return config
}

// Utility functions for performance optimization
export const performanceUtils = {
  // Check if device can handle video generation
  canHandleVideoGeneration: (config: MobilePerformanceConfig): boolean => {
    if (config.isLowEndDevice) {
      // Low-end devices should use server-side generation
      return false
    }
    return true
  },

  // Get recommended video settings for device
  getRecommendedVideoSettings: (config: MobilePerformanceConfig) => {
    return {
      quality: config.isLowEndDevice ? 'low' : config.isMobile ? 'medium' : 'high',
      resolution: config.maxResolution,
      chunkSize: config.maxChunkSize,
      enableHardwareAcceleration: !config.isLowEndDevice,
      maxConcurrentOperations: config.isLowEndDevice ? 1 : config.isMobile ? 2 : 4
    }
  },

  // Monitor memory usage during video generation
  monitorMemoryUsage: (): { used: number; limit: number; percentage: number } => {
    const nav = navigator as any
    if (nav.memory) {
      return {
        used: nav.memory.usedJSHeapSize / 1024 / 1024, // MB
        limit: nav.memory.jsHeapSizeLimit / 1024 / 1024, // MB
        percentage: (nav.memory.usedJSHeapSize / nav.memory.jsHeapSizeLimit) * 100
      }
    }
    return { used: 0, limit: 0, percentage: 0 }
  },

  // Check if device should fallback to server-side generation
  shouldUseServerSideGeneration: (config: MobilePerformanceConfig): boolean => {
    const memoryUsage = performanceUtils.monitorMemoryUsage()
    
    // Use server-side if:
    // 1. Low-end device
    // 2. High memory usage (>80%)
    // 3. Mobile with limited memory
    return config.isLowEndDevice || 
           memoryUsage.percentage > 80 || 
           (config.isMobile && memoryUsage.limit < 512)
  }
}