import { useState, useEffect } from 'react'

export interface MobilePerformanceConfig {
  isMobile: boolean
  isLowEndDevice: boolean
  memoryLimit: number
  maxResolution: string
  recommendedQuality: 'low' | 'medium' | 'high'
  canHandleVideoGeneration: boolean
  deviceMemory?: number
  hardwareConcurrency?: number
  connectionType?: string
}

export function useMobilePerformance(): MobilePerformanceConfig {
  const [config, setConfig] = useState<MobilePerformanceConfig>({
    isMobile: false,
    isLowEndDevice: false,
    memoryLimit: 2048,
    maxResolution: '1080p',
    recommendedQuality: 'high',
    canHandleVideoGeneration: true
  })

  useEffect(() => {
    const detectMobilePerformance = () => {
      // Detect mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       window.innerWidth <= 768

      // Get device memory if available
      const deviceMemory = (navigator as any).deviceMemory || 4
      
      // Get hardware concurrency (CPU cores)
      const hardwareConcurrency = navigator.hardwareConcurrency || 4
      
      // Get connection type if available
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      const connectionType = connection?.effectiveType || 'unknown'
      
      // Determine if it's a low-end device
      const isLowEndDevice = (
        deviceMemory <= 2 ||
        hardwareConcurrency <= 2 ||
        connectionType === 'slow-2g' ||
        connectionType === '2g'
      )
      
      // Set memory limits based on device capabilities
      let memoryLimit: number
      if (isLowEndDevice) {
        memoryLimit = 512 // 512MB for low-end devices
      } else if (isMobile) {
        memoryLimit = 1024 // 1GB for mobile devices
      } else {
        memoryLimit = 2048 // 2GB for desktop
      }
      
      // Determine max resolution
      let maxResolution: string
      if (isLowEndDevice) {
        maxResolution = '720p'
      } else if (isMobile) {
        maxResolution = '1080p'
      } else {
        maxResolution = '4k'
      }
      
      // Determine recommended quality
      let recommendedQuality: 'low' | 'medium' | 'high'
      if (isLowEndDevice) {
        recommendedQuality = 'low'
      } else if (isMobile) {
        recommendedQuality = 'medium'
      } else {
        recommendedQuality = 'high'
      }
      
      // Determine if device can handle video generation
      const canHandleVideoGeneration = (
        deviceMemory >= 2 &&
        hardwareConcurrency >= 2 &&
        connectionType !== 'slow-2g' &&
        connectionType !== '2g'
      )
      
      setConfig({
        isMobile,
        isLowEndDevice,
        memoryLimit,
        maxResolution,
        recommendedQuality,
        canHandleVideoGeneration,
        deviceMemory,
        hardwareConcurrency,
        connectionType
      })
    }

    detectMobilePerformance()
    
    // Re-detect on window resize
    window.addEventListener('resize', detectMobilePerformance)
    
    return () => {
      window.removeEventListener('resize', detectMobilePerformance)
    }
  }, [])

  return config
}

// Performance utilities
export const performanceUtils = {
  /**
   * Get recommended video settings based on device capabilities
   */
  getRecommendedVideoSettings(config: MobilePerformanceConfig) {
    return {
      quality: config.recommendedQuality,
      resolution: config.maxResolution,
      fps: config.isLowEndDevice ? 24 : 30,
      bitrate: config.isLowEndDevice ? 'low' : config.isMobile ? 'medium' : 'high'
    }
  },

  /**
   * Check if device can handle video generation
   */
  canHandleVideoGeneration(config: MobilePerformanceConfig): boolean {
    return config.canHandleVideoGeneration
  },

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage(): { used: number; total: number; percentage: number } {
    try {
      const memory = (performance as any).memory
      if (memory) {
        const used = memory.usedJSHeapSize / 1024 / 1024 // MB
        const total = memory.totalJSHeapSize / 1024 / 1024 // MB
        const percentage = (used / total) * 100
        
        return { used, total, percentage }
      }
    } catch (_error) {
      console.warn('Memory monitoring not available:', _error)
    }
    
    return { used: 0, total: 0, percentage: 0 }
  },

  /**
   * Optimize settings for current device
   */
  optimizeForDevice(config: MobilePerformanceConfig) {
    const optimizations = {
      chunkSize: config.isLowEndDevice ? 1 : config.isMobile ? 2 : 3,
      delayBetweenChunks: config.isLowEndDevice ? 100 : config.isMobile ? 50 : 10,
      maxConcurrentOperations: config.isLowEndDevice ? 1 : config.isMobile ? 2 : 4,
      enableProgressiveLoading: config.isMobile,
      enableImageOptimization: config.isLowEndDevice || config.isMobile,
      maxImageSize: config.isLowEndDevice ? 512 : config.isMobile ? 1024 : 2048
    }
    
    return optimizations
  },

  /**
   * Check if operation should be throttled
   */
  shouldThrottle(config: MobilePerformanceConfig, operationType: string): boolean {
    const memoryUsage = this.monitorMemoryUsage()
    
    // Throttle if memory usage is high
    if (memoryUsage.percentage > 80) {
      return true
    }
    
    // Throttle heavy operations on low-end devices
    if (config.isLowEndDevice && ['video-generation', 'image-processing'].includes(operationType)) {
      return true
    }
    
    // Throttle on slow connections
    if (config.connectionType === 'slow-2g' || config.connectionType === '2g') {
      return true
    }
    
    return false
  },

  /**
   * Get optimal batch size for operations
   */
  getOptimalBatchSize(config: MobilePerformanceConfig, operationType: string): number {
    const baseSizes = {
      'slide-generation': 5,
      'image-processing': 3,
      'video-processing': 1,
      'text-generation': 10
    }
    
    const baseSize = baseSizes[operationType as keyof typeof baseSizes] || 3
    
    if (config.isLowEndDevice) {
      return Math.max(1, Math.floor(baseSize / 3))
    } else if (config.isMobile) {
      return Math.max(1, Math.floor(baseSize / 2))
    }
    
    return baseSize
  },

  /**
   * Estimate processing time based on device capabilities
   */
  estimateProcessingTime(
    config: MobilePerformanceConfig,
    operationType: string,
    complexity: number
  ): number {
    const baseTimeMultipliers = {
      'slide-generation': 1,
      'video-generation': 10,
      'image-processing': 2,
      'text-generation': 0.5
    }
    
    const baseTime = baseTimeMultipliers[operationType as keyof typeof baseTimeMultipliers] || 1
    
    let deviceMultiplier = 1
    if (config.isLowEndDevice) {
      deviceMultiplier = 3
    } else if (config.isMobile) {
      deviceMultiplier = 2
    }
    
    return baseTime * complexity * deviceMultiplier
  }
}