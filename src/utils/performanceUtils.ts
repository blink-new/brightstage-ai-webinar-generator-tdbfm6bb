/**
 * Performance utilities to prevent UI freezing and improve responsiveness
 */

/**
 * Executes a function with requestAnimationFrame to prevent blocking
 */
export function executeNonBlocking<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    requestAnimationFrame(() => {
      try {
        const result = fn()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
  })
}

/**
 * Executes an async function with a small delay to allow UI updates
 */
export function executeWithDelay<T>(fn: () => Promise<T>, delay: number = 10): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}

/**
 * Processes an array in chunks to prevent blocking
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  chunkSize: number = 3,
  delayBetweenChunks: number = 10
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    
    // Process chunk with requestAnimationFrame
    const chunkResults = await new Promise<R[]>((resolve, reject) => {
      requestAnimationFrame(async () => {
        try {
          const promises = chunk.map((item, chunkIndex) => 
            processor(item, i + chunkIndex)
          )
          const chunkResults = await Promise.all(promises)
          resolve(chunkResults)
        } catch (error) {
          reject(error)
        }
      })
    })
    
    results.push(...chunkResults)
    
    // Small delay between chunks to allow UI updates
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenChunks))
    }
  }
  
  return results
}

/**
 * Throttles function calls to prevent excessive updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Debounces function calls to prevent rapid successive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * Creates a safe blob URL with automatic cleanup
 */
export function createSafeBlobUrl(blob: Blob): { url: string; cleanup: () => void } {
  const url = URL.createObjectURL(blob)
  
  const cleanup = () => {
    try {
      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('Failed to revoke blob URL:', error)
    }
  }
  
  // Auto-cleanup after 5 minutes as safety measure
  setTimeout(cleanup, 5 * 60 * 1000)
  
  return { url, cleanup }
}

/**
 * Safely executes JSON.stringify without blocking the main thread
 */
export async function safeJsonStringify(obj: any, space?: number): Promise<string> {
  return executeNonBlocking(() => JSON.stringify(obj, null, space))
}

/**
 * Safely executes JSON.parse without blocking the main thread
 */
export async function safeJsonParse<T = any>(str: string): Promise<T> {
  return executeNonBlocking(() => JSON.parse(str))
}

/**
 * Memory-safe file download with automatic cleanup
 */
export function downloadFileWithCleanup(blob: Blob, filename: string): void {
  const { url, cleanup } = createSafeBlobUrl(blob)
  
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    
    // Use requestAnimationFrame to ensure DOM update
    requestAnimationFrame(() => {
      link.click()
      
      // Cleanup after download
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
        cleanup()
      }, 1000)
    })
    
  } catch (error) {
    cleanup() // Ensure cleanup even on error
    throw error
  }
}

/**
 * Monitors performance and warns about potential blocking operations
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private startTime: number = 0
  private operationName: string = ''
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  
  startOperation(name: string): void {
    this.operationName = name
    this.startTime = performance.now()
  }
  
  endOperation(): void {
    const duration = performance.now() - this.startTime
    
    if (duration > 100) { // Warn if operation takes more than 100ms
      console.warn(`Performance warning: ${this.operationName} took ${duration.toFixed(2)}ms`)
    }
    
    if (duration > 1000) { // Error if operation takes more than 1 second
      console.error(`Performance error: ${this.operationName} took ${duration.toFixed(2)}ms - this may cause UI freezing`)
    }
  }
  
  async monitorAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.startOperation(name)
    try {
      const result = await operation()
      this.endOperation()
      return result
    } catch (error) {
      this.endOperation()
      throw error
    }
  }
  
  monitor<T>(name: string, operation: () => T): T {
    this.startOperation(name)
    try {
      const result = operation()
      this.endOperation()
      return result
    } catch (error) {
      this.endOperation()
      throw error
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance()