/**
 * Performance Monitoring Utilities
 * Provides decorators and tools for tracking application performance and preventing memory leaks
 */

import { performance } from 'perf_hooks';
import { Logger } from './logger.js';

/**
 * Performance metrics interface
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Performance monitor class for tracking metrics
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly logger = new Logger('Performance');
  private readonly maxMetrics = 1000; // Prevent memory leaks
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.setupCleanup();
    this.setupMemoryMonitoring();
  }

  /**
   * Record a performance metric
   */
  record(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift(); // Remove oldest metric
    }

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
      memoryUsage: process.env.MONITOR_MEMORY_USAGE === 'true' 
        ? process.memoryUsage() 
        : undefined
    };

    this.metrics.push(metric);

    // Log slow operations
    const threshold = parseFloat(process.env.PERFORMANCE_THRESHOLD || '1000');
    if (duration > threshold) {
      this.logger.warn('Slow operation detected', {
        name,
        duration,
        threshold,
        ...metadata
      });
    }

    // Log performance metric
    this.logger.performance(name, duration, 'ms', metadata);
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow?: number): {
    totalMetrics: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
    operationCounts: Record<string, number>;
    memoryTrend?: {
      initial: number;
      current: number;
      peak: number;
    };
  } {
    const now = Date.now();
    const relevantMetrics = timeWindow
      ? this.metrics.filter(m => now - m.timestamp <= timeWindow)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
        operationCounts: {}
      };
    }

    const durations = relevantMetrics.map(m => m.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    const slowestOperation = relevantMetrics.reduce((prev, current) => 
      prev.duration > current.duration ? prev : current
    );
    
    const fastestOperation = relevantMetrics.reduce((prev, current) => 
      prev.duration < current.duration ? prev : current
    );

    const operationCounts = relevantMetrics.reduce((counts, metric) => {
      counts[metric.name] = (counts[metric.name] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Calculate memory trend if available
    let memoryTrend;
    const metricsWithMemory = relevantMetrics.filter(m => m.memoryUsage);
    if (metricsWithMemory.length > 0) {
      const memoryValues = metricsWithMemory.map(m => m.memoryUsage!.heapUsed);
      memoryTrend = {
        initial: memoryValues[0],
        current: memoryValues[memoryValues.length - 1],
        peak: Math.max(...memoryValues)
      };
    }

    return {
      totalMetrics: relevantMetrics.length,
      averageDuration,
      slowestOperation,
      fastestOperation,
      operationCounts,
      memoryTrend
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.logger.info('Performance metrics cleared');
  }

  /**
   * Setup periodic cleanup to prevent memory leaks
   */
  private setupCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      const initialCount = this.metrics.length;
      this.metrics = this.metrics.filter(m => now - m.timestamp <= maxAge);
      
      const removedCount = initialCount - this.metrics.length;
      if (removedCount > 0) {
        this.logger.debug('Cleaned up old performance metrics', {
          removed: removedCount,
          remaining: this.metrics.length
        });
      }
    }, 60 * 60 * 1000); // Run every hour

    // Don't keep the process alive
    this.cleanupInterval.unref();
  }

  /**
   * Setup memory monitoring alerts
   */
  private setupMemoryMonitoring(): void {
    if (process.env.MONITOR_MEMORY_USAGE !== 'true') return;

    const checkInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

      const warningThreshold = parseFloat(
        process.env.MEMORY_THRESHOLD_WARNING || '80'
      );
      const criticalThreshold = parseFloat(
        process.env.MEMORY_THRESHOLD_CRITICAL || '95'
      );

      if (usagePercentage >= criticalThreshold) {
        this.logger.error('Critical memory usage detected', {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          usagePercentage: Math.round(usagePercentage),
          threshold: criticalThreshold
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          this.logger.info('Forced garbage collection due to high memory usage');
        }
      } else if (usagePercentage >= warningThreshold) {
        this.logger.warn('High memory usage detected', {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          usagePercentage: Math.round(usagePercentage),
          threshold: warningThreshold
        });
      }
    }, 30000); // Check every 30 seconds

    checkInterval.unref();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global performance monitor instance
const performanceMonitorInstance = new PerformanceMonitor();

/**
 * Performance monitoring decorator
 * Tracks execution time and logs performance metrics
 */
export function performanceMonitor(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      try {
        const result = await method.apply(this, args);
        const duration = performance.now() - startTime;
        
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        
        performanceMonitorInstance.record(name, duration, {
          args: args.length,
          memoryDelta: memoryDelta > 0 ? Math.round(memoryDelta / 1024) : 0, // KB
          success: true
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        performanceMonitorInstance.record(name, duration, {
          args: args.length,
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Simple performance timer for manual tracking
 */
export class PerformanceTimer {
  private startTime: number;
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  /**
   * End the timer and record the metric
   */
  end(metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    performanceMonitorInstance.record(this.name, duration, metadata);
    return duration;
  }

  /**
   * Get elapsed time without ending the timer
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = performance.now();
  }
}

/**
 * Create a new performance timer
 */
export function createTimer(name: string): PerformanceTimer {
  return new PerformanceTimer(name);
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  name: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>
): Promise<{ result: T; duration: number }> {
  const timer = createTimer(name);
  
  try {
    const result = await fn();
    const duration = timer.end({ ...metadata, success: true });
    return { result, duration };
  } catch (error) {
    const duration = timer.end({ 
      ...metadata, 
      success: false, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(timeWindowMs?: number) {
  return performanceMonitorInstance.getStats(timeWindowMs);
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  performanceMonitorInstance.clear();
}

/**
 * Graceful shutdown cleanup
 */
process.on('SIGINT', () => {
  performanceMonitorInstance.destroy();
});

process.on('SIGTERM', () => {
  performanceMonitorInstance.destroy();
});
