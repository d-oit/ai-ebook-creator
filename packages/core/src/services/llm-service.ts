/**
 * LLM Service Implementation
 * Provides unified interface for multiple AI providers with caching and error handling
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, streamText } from 'ai';
import { z } from 'zod';
import retry from 'async-retry';
import type {
  AIProvider,
  AIConfig,
  AIResponse,
  AIServiceError
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { performanceMonitor } from '../utils/performance.js';
import { CacheManager } from '../utils/cache.js';

export class LLMService {
  private readonly providers: Map<AIProvider, any> = new Map();
  private readonly logger = new Logger('LLMService');
  private readonly cache: CacheManager;
  private readonly defaultConfig: AIConfig;
  private readonly fallbackOrder: AIProvider[];

  constructor(config: {
    providers: Record<AIProvider, AIConfig>;
    defaultProvider: AIProvider;
    fallbackOrder: AIProvider[];
    cacheConfig?: { ttl: number; maxSize: number };
  }) {
    this.defaultConfig = config.providers[config.defaultProvider];
    this.fallbackOrder = config.fallbackOrder;
    this.cache = new CacheManager(
      config.cacheConfig?.ttl || 3600,
      config.cacheConfig?.maxSize || 1000
    );

    this.initializeProviders(config.providers);
    this.setupErrorHandling();
  }

  /**
   * Generate text with automatic provider fallback
   */
  @performanceMonitor('llm_generate_text')
  async generateText(
    prompt: string,
    options: {
      model?: string;
      provider?: AIProvider;
      temperature?: number;
      maxTokens?: number;
      useCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<AIResponse<string>> {
    const cacheKey = options.useCache !== false ? 
      this.getCacheKey('text', prompt, options) : null;
    
    if (cacheKey && this.cache.has(cacheKey)) {
      this.logger.debug('Cache hit for text generation', { cacheKey });
      return this.cache.get(cacheKey);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    // Try providers in fallback order
    const providersToTry = options.provider ? 
      [options.provider] : 
      this.fallbackOrder;

    for (const provider of providersToTry) {
      try {
        const model = this.getModel(provider, options.model);
        if (!model) {
          throw new Error(`Model not available for provider ${provider}`);
        }

        const result = await retry(
          async () => {
            const response = await generateText({
              model,
              prompt,
              temperature: options.temperature ?? 0.7,
              maxTokens: options.maxTokens ?? 4000,
              abortSignal: options.timeout ? 
                AbortSignal.timeout(options.timeout) : undefined
            });

            return {
              content: response.text,
              provider,
              model: options.model || this.getDefaultModel(provider),
              usage: {
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens,
                totalTokens: response.usage.totalTokens
              },
              duration: Date.now() - startTime,
              finishReason: response.finishReason
            } as AIResponse<string>;
          },
          {
            retries: 3,
            minTimeout: 1000,
            maxTimeout: 5000,
            onRetry: (error, attempt) => {
              this.logger.warn('LLM request retry', {
                provider,
                attempt,
                error: error.message
              });
            }
          }
        );

        // Cache successful result
        if (cacheKey) {
          this.cache.set(cacheKey, result);
        }

        this.logger.info('Text generation successful', {
          provider,
          duration: result.duration,
          tokenCount: result.usage.totalTokens
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('Provider failed, trying next', {
          provider,
          error: lastError.message
        });
      }
    }

    // All providers failed
    const errorMessage = `All providers failed. Last error: ${lastError?.message}`;
    this.logger.error('Text generation failed', {
      error: errorMessage,
      providersAttempted: providersToTry
    });

    throw new AIServiceError(
      errorMessage,
      providersToTry[0],
      'GENERATION_FAILED',
      lastError || undefined
    );
  }

  /**
   * Generate structured object using schema validation
   */
  @performanceMonitor('llm_generate_object')
  async generateObject<T>(
    options: {
      schema: z.ZodSchema<T>;
      prompt: string;
      model?: string;
      provider?: AIProvider;
      temperature?: number;
      useCache?: boolean;
    }
  ): Promise<T> {
    const cacheKey = options.useCache !== false ?
      this.getCacheKey('object', options.prompt, options) : null;
    
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const provider = options.provider || this.fallbackOrder[0];
    const model = this.getModel(provider, options.model);
    
    if (!model) {
      throw new AIServiceError(
        `Model not available for provider ${provider}`,
        provider,
        'MODEL_UNAVAILABLE'
      );
    }

    try {
      const result = await generateObject({
        model,
        schema: options.schema,
        prompt: options.prompt,
        temperature: options.temperature ?? 0.7
      });

      if (cacheKey) {
        this.cache.set(cacheKey, result.object);
      }

      return result.object;
    } catch (error) {
      const errorMessage = `Object generation failed: ${error.message}`;
      this.logger.error(errorMessage, { provider, error });
      
      throw new AIServiceError(
        errorMessage,
        provider,
        'OBJECT_GENERATION_FAILED',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Stream text generation for real-time updates
   */
  async *streamText(
    prompt: string,
    options: {
      model?: string;
      provider?: AIProvider;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncIterableIterator<{
    content: string;
    done: boolean;
    usage?: { totalTokens: number };
  }> {
    const provider = options.provider || this.fallbackOrder[0];
    const model = this.getModel(provider, options.model);
    
    if (!model) {
      throw new AIServiceError(
        `Model not available for provider ${provider}`,
        provider,
        'MODEL_UNAVAILABLE'
      );
    }

    try {
      const stream = await streamText({
        model,
        prompt,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4000
      });

      for await (const chunk of stream.textStream) {
        yield {
          content: chunk,
          done: false
        };
      }

      // Final chunk with usage information
      const finalResult = await stream.finalize();
      yield {
        content: '',
        done: true,
        usage: {
          totalTokens: finalResult.usage.totalTokens
        }
      };
    } catch (error) {
      throw new AIServiceError(
        `Stream generation failed: ${error.message}`,
        provider,
        'STREAM_FAILED',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Initialize AI providers
   */
  private initializeProviders(configs: Record<AIProvider, AIConfig>): void {
    for (const [provider, config] of Object.entries(configs)) {
      try {
        let providerInstance;
        
        switch (provider as AIProvider) {
          case 'anthropic':
            providerInstance = createAnthropic({
              apiKey: process.env.ANTHROPIC_API_KEY!
            });
            break;
          case 'openai':
            providerInstance = createOpenAI({
              apiKey: process.env.OPENAI_API_KEY!,
              organization: process.env.OPENAI_ORG_ID
            });
            break;
          case 'google':
            providerInstance = createGoogleGenerativeAI({
              apiKey: process.env.GOOGLE_API_KEY!
            });
            break;
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }
        
        this.providers.set(provider as AIProvider, providerInstance);
        this.logger.info('Provider initialized', { provider });
      } catch (error) {
        this.logger.error('Failed to initialize provider', {
          provider,
          error: error.message
        });
      }
    }
  }

  /**
   * Get model instance for provider
   */
  private getModel(provider: AIProvider, modelName?: string): any {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return null;

    const model = modelName || this.getDefaultModel(provider);
    return providerInstance(model);
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: AIProvider): string {
    const defaults = {
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4-turbo',
      google: 'gemini-1.5-pro'
    };
    return defaults[provider];
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(
    type: string,
    prompt: string,
    options: any
  ): string {
    const key = {
      type,
      prompt: prompt.slice(0, 100), // Truncate for key length
      model: options.model,
      provider: options.provider,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    };
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled promise rejection in LLM service', {
        reason: String(reason)
      });
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('LLM cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return this.cache.getStats();
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<Record<AIProvider, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const provider of this.fallbackOrder) {
      try {
        await this.generateText('Hello', {
          provider,
          maxTokens: 10,
          useCache: false,
          timeout: 5000
        });
        results[provider] = true;
      } catch {
        results[provider] = false;
      }
    }
    
    return results as Record<AIProvider, boolean>;
  }
}
