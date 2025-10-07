/**
 * Structured Logging Utility
 * Provides comprehensive logging with performance monitoring and memory leak prevention
 */

import winston from 'winston';
import { performance } from 'perf_hooks';

/**
 * Log levels for different types of messages
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Structured log entry interface
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  metadata?: Record<string, any>;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Logger configuration options
 */
interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text';
  maxSize: string;
  maxFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
  enableMemoryTracking: boolean;
}

/**
 * Enhanced Logger class with performance monitoring
 */
export class Logger {
  private readonly winston: winston.Logger;
  private readonly serviceName: string;
  private readonly memoryTrackingEnabled: boolean;
  private readonly startTimes = new Map<string, number>();
  
  // Memory leak prevention - limit stored start times
  private readonly maxStoredTimes = 1000;

  constructor(serviceName: string, config?: Partial<LoggerConfig>) {
    this.serviceName = serviceName;
    
    const defaultConfig: LoggerConfig = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      enableConsole: process.env.NODE_ENV !== 'test',
      enableFile: process.env.LOG_FILE_PATH !== undefined,
      enableMemoryTracking: process.env.MONITOR_MEMORY_USAGE === 'true'
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    this.memoryTrackingEnabled = finalConfig.enableMemoryTracking;
    
    this.winston = this.createWinstonLogger(finalConfig);
    this.setupCleanupInterval();
  }

  /**
   * Log error message with optional metadata
   */
  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  /**
   * Log warning message with optional metadata
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log info message with optional metadata
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Log debug message with optional metadata
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId: string): void {
    // Prevent memory leaks by limiting stored timers
    if (this.startTimes.size >= this.maxStoredTimes) {
      const firstKey = this.startTimes.keys().next().value;
      this.startTimes.delete(firstKey);
    }
    
    this.startTimes.set(operationId, performance.now());
  }

  /**
   * End timing an operation and log the duration
   */
  endTimer(
    operationId: string, 
    message: string, 
    metadata?: Record<string, any>
  ): number {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      this.warn('Timer not found', { operationId });
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.startTimes.delete(operationId);
    
    this.log('info', message, {
      ...metadata,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      operationId
    });
    
    return duration;
  }

  /**
   * Log performance metrics
   */
  performance(
    metric: string, 
    value: number, 
    unit: string = 'ms',
    metadata?: Record<string, any>
  ): void {
    this.log('info', `Performance: ${metric}`, {
      ...metadata,
      metric,
      value,
      unit,
      type: 'performance'
    });
  }

  /**
   * Log memory usage
   */
  logMemoryUsage(operation?: string): void {
    if (!this.memoryTrackingEnabled) return;
    
    const memUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    this.log('debug', 'Memory usage', {
      operation,
      memory: memoryMB,
      type: 'memory'
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: Record<string, any>): Logger {
    const childLogger = new Logger(`${this.serviceName}:${additionalContext.module || 'child'}`);
    
    // Copy the winston logger with additional context
    childLogger.winston.defaultMeta = {
      ...childLogger.winston.defaultMeta,
      ...additionalContext
    };
    
    return childLogger;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel, 
    message: string, 
    metadata?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      metadata
    };
    
    // Add memory usage if enabled
    if (this.memoryTrackingEnabled && level === 'error') {
      logEntry.memoryUsage = process.memoryUsage();
    }
    
    this.winston.log(level, message, logEntry);
  }

  /**
   * Create Winston logger instance
   */
  private createWinstonLogger(config: LoggerConfig): winston.Logger {
    const transports: winston.transport[] = [];
    
    // Console transport
    if (config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: config.format === 'json' 
            ? winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, service, metadata }) => {
                  const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
                  return `${timestamp} [${service}] ${level}: ${message}${meta}`;
                })
              )
        })
      );
    }
    
    // File transport
    if (config.enableFile && process.env.LOG_FILE_PATH) {
      transports.push(
        new winston.transports.File({
          filename: process.env.LOG_FILE_PATH,
          maxsize: this.parseSize(config.maxSize),
          maxFiles: config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );
    }
    
    return winston.createLogger({
      level: config.level,
      defaultMeta: { service: this.serviceName },
      transports,
      // Prevent memory leaks from winston
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true
    });
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const units = { b: 1, k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = sizeStr.toLowerCase().match(/(\d+)([bkmg])?/);
    
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const size = parseInt(match[1]);
    const unit = match[2] as keyof typeof units || 'b';
    
    return size * units[unit];
  }

  /**
   * Setup cleanup interval to prevent memory leaks
   */
  private setupCleanupInterval(): void {
    // Clean up old timers every 5 minutes
    const cleanupInterval = setInterval(() => {
      const now = performance.now();
      const maxAge = 300000; // 5 minutes in milliseconds
      
      for (const [id, startTime] of this.startTimes.entries()) {
        if (now - startTime > maxAge) {
          this.startTimes.delete(id);
          this.warn('Cleaned up stale timer', { operationId: id });
        }
      }
    }, 300000);
    
    // Don't keep the process alive for cleanup
    cleanupInterval.unref();
  }

  /**
   * Get logger statistics for monitoring
   */
  getStats(): {
    activeTimers: number;
    serviceName: string;
    memoryTrackingEnabled: boolean;
  } {
    return {
      activeTimers: this.startTimes.size,
      serviceName: this.serviceName,
      memoryTrackingEnabled: this.memoryTrackingEnabled
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.startTimes.clear();
    this.winston.close();
  }
}

/**
 * Global logger instance for application-wide logging
 */
export const logger = new Logger('App', {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enableMemoryTracking: process.env.MONITOR_MEMORY_USAGE === 'true'
});

/**
 * Create a logger for a specific service/module
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
