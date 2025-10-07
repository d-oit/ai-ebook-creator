/**
 * Core types for AI eBook Creator - GOAP System & AI Services
 * Maintains strict type safety with comprehensive error handling
 */

import type { z } from 'zod';

// =============================================================================
// GOAP (Goal-Oriented Action Planning) Types
// =============================================================================

export interface WorldState {
  readonly [key: string]: boolean | number | string | null;
}

export interface Goal {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly conditions: Partial<WorldState>;
  readonly timeout?: number;
}

export interface Action {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly preconditions: Partial<WorldState>;
  readonly effects: Partial<WorldState>;
  readonly timeout?: number;
  execute(context: ActionContext): Promise<ActionResult>;
}

export interface ActionContext {
  readonly worldState: WorldState;
  readonly goal: Goal;
  readonly metadata?: Record<string, unknown>;
}

export interface ActionResult {
  readonly success: boolean;
  readonly newState?: Partial<WorldState>;
  readonly data?: unknown;
  readonly error?: Error;
  readonly duration: number;
}

export interface ActionPlan {
  readonly id: string;
  readonly goal: Goal;
  readonly actions: ReadonlyArray<Action>;
  readonly estimatedCost: number;
  readonly estimatedDuration: number;
  readonly createdAt: Date;
}

// =============================================================================
// AI Service Types
// =============================================================================

export type AIProvider = 'anthropic' | 'openai' | 'google';

export interface AIConfig {
  readonly provider: AIProvider;
  readonly model: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly timeout?: number;
  readonly retries?: number;
}

export interface PromptTemplate {
  readonly id: string;
  readonly name: string;
  readonly template: string;
  readonly variables: ReadonlyArray<string>;
  readonly language: Language;
}

export interface AIResponse<T = string> {
  readonly content: T;
  readonly provider: AIProvider;
  readonly model: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly duration: number;
  readonly finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

// =============================================================================
// eBook Generation Types
// =============================================================================

export type Language = 'en' | 'de';
export type InputType = 'topic' | 'link' | 'incomplete_book';
export type ExportFormat = 'pdf' | 'epub' | 'html' | 'docx';

export interface EBookInput {
  readonly type: InputType;
  readonly content: string;
  readonly language: Language;
  readonly targetLength?: number;
  readonly tone?: 'academic' | 'casual' | 'professional';
  readonly audience?: string;
}

export interface EnhancedPrompt {
  readonly original: string;
  readonly enhanced: string;
  readonly structure: ReadonlyArray<string>;
  readonly targetAudience: string;
  readonly estimatedLength: number;
  readonly language: Language;
  readonly complexity: number;
}

export interface Chapter {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly order: number;
  readonly wordCount: number;
  readonly language: Language;
  readonly grammarScore?: number;
  readonly readabilityScore?: number;
}

export interface EBook {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly chapters: ReadonlyArray<Chapter>;
  readonly metadata: EBookMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface EBookMetadata {
  readonly author: string;
  readonly language: Language;
  readonly wordCount: number;
  readonly chapterCount: number;
  readonly estimatedReadingTime: number;
  readonly tags: ReadonlyArray<string>;
  readonly version: string;
}

// =============================================================================
// Database Types (PocketBase)
// =============================================================================

export interface BaseRecord {
  readonly id: string;
  readonly created: string;
  readonly updated: string;
  readonly collectionId: string;
  readonly collectionName: string;
}

export interface UserRecord extends BaseRecord {
  readonly email: string;
  readonly name: string;
  readonly avatar?: string;
  readonly verified: boolean;
}

export interface ProjectRecord extends BaseRecord {
  readonly title: string;
  readonly description: string;
  readonly inputContent: string;
  readonly inputType: InputType;
  readonly language: Language;
  readonly status: ProjectStatus;
  readonly progress: number;
  readonly userId: string;
  readonly enhancedPrompt?: string;
}

export interface ChapterRecord extends BaseRecord {
  readonly projectId: string;
  readonly title: string;
  readonly content: string;
  readonly order: number;
  readonly status: ChapterStatus;
  readonly wordCount: number;
  readonly grammarScore?: number;
}

export type ProjectStatus = 
  | 'draft'
  | 'enhancing_prompt'
  | 'planning_content'
  | 'generating_chapters'
  | 'editing_content'
  | 'completed'
  | 'failed';

export type ChapterStatus = 'pending' | 'generating' | 'completed' | 'error';

// =============================================================================
// Error Types
// =============================================================================

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class GOAPPlanningError extends Error {
  constructor(
    message: string,
    public readonly goal: Goal,
    public readonly worldState: WorldState,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GOAPPlanningError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// Utility Types
// =============================================================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// =============================================================================
// Configuration Types
// =============================================================================

export interface AppConfig {
  readonly ai: {
    readonly providers: Record<AIProvider, AIConfig>;
    readonly defaultProvider: AIProvider;
    readonly fallbackOrder: ReadonlyArray<AIProvider>;
  };
  readonly database: {
    readonly url: string;
    readonly timeout: number;
    readonly retries: number;
  };
  readonly cache: {
    readonly ttl: number;
    readonly maxSize: number;
    readonly redis?: {
      readonly url: string;
      readonly db: number;
    };
  };
  readonly performance: {
    readonly memoryThreshold: number;
    readonly gcInterval: number;
    readonly maxConcurrentTasks: number;
  };
  readonly logging: {
    readonly level: 'error' | 'warn' | 'info' | 'debug';
    readonly format: 'json' | 'text';
    readonly maxSize: string;
    readonly maxFiles: number;
  };
}

// =============================================================================
// Event Types
// =============================================================================

export interface SystemEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Date;
  readonly data: unknown;
  readonly source: string;
}

export interface ProgressEvent extends SystemEvent {
  readonly type: 'progress';
  readonly data: {
    readonly projectId: string;
    readonly stage: string;
    readonly progress: number;
    readonly message?: string;
  };
}

export interface ErrorEvent extends SystemEvent {
  readonly type: 'error';
  readonly data: {
    readonly error: Error;
    readonly context?: unknown;
  };
}

export interface PerformanceEvent extends SystemEvent {
  readonly type: 'performance';
  readonly data: {
    readonly metric: string;
    readonly value: number;
    readonly threshold?: number;
  };
}
