import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EBookGenerationService } from '@core/services/ebook-generation-service';
import { logger } from '@core/utils/logger';
import { validateEnv } from '@/lib/env-validation';
import { rateLimit } from '@/lib/rate-limit';
import { PocketBaseService } from '@core/services/pocketbase-service';

// Validate environment variables
validateEnv();

// Request validation schema
const GenerationRequestSchema = z.object({
  type: z.enum(['topic', 'link', 'incomplete_book']),
  content: z.string().min(10).max(5000),
  language: z.enum(['en', 'de']),
  targetLength: z.number().optional().default(15000),
  tone: z.enum(['academic', 'casual', 'professional']).optional().default('casual'),
  audience: z.string().optional(),
});

type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let projectId: string | null = null;

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedInput = GenerationRequestSchema.parse(body);

    logger.info('Generation request received', {
      type: validatedInput.type,
      language: validatedInput.language,
      contentLength: validatedInput.content.length,
      ip: request.ip,
    });

    // Initialize services
    const pbService = new PocketBaseService();
    const generationService = new EBookGenerationService();

    // Create project record
    const project = await pbService.createProject({
      title: `Generated eBook - ${new Date().toISOString()}`,
      description: 'AI-generated eBook',
      inputContent: validatedInput.content,
      inputType: validatedInput.type,
      language: validatedInput.language,
      status: 'enhancing_prompt',
      progress: 0,
      userId: 'anonymous', // TODO: Add auth
    });
    projectId = project.id;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let progress = 0;
          const updateProgress = (stage: string, newProgress: number) => {
            progress = newProgress;
            const data = JSON.stringify({
              type: 'progress',
              stage,
              progress,
              projectId,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          // Phase 1: Enhance prompt (10%)
          updateProgress('enhancing_prompt', 10);
          await pbService.updateProject(projectId!, { status: 'enhancing_prompt' });
          
          const enhancedPrompt = await generationService.enhancePrompt(validatedInput);
          await pbService.updateProject(projectId!, { enhancedPrompt: JSON.stringify(enhancedPrompt) });

          // Phase 2: Plan content (25%)
          updateProgress('planning_content', 25);
          await pbService.updateProject(projectId!, { status: 'planning_content' });
          
          const contentPlan = await generationService.createContentPlan(enhancedPrompt);

          // Phase 3: Generate chapters (25% - 80%)
          await pbService.updateProject(projectId!, { status: 'generating_chapters' });
          
          const chapters = [];
          const chapterIncrement = 55 / contentPlan.chapters.length;
          
          for (let i = 0; i < contentPlan.chapters.length; i++) {
            const chapterOutline = contentPlan.chapters[i];
            updateProgress(`generating_chapter_${i + 1}`, 25 + (i * chapterIncrement));
            
            const chapter = await generationService.generateChapter(
              chapterOutline,
              enhancedPrompt,
              i
            );
            
            chapters.push(chapter);
            
            // Save chapter to database
            await pbService.createChapter({
              projectId: projectId!,
              title: chapter.title,
              content: chapter.content,
              order: i,
              status: 'completed',
              wordCount: chapter.wordCount,
            });
          }

          // Phase 4: Grammar check (90%)
          updateProgress('checking_grammar', 90);
          await pbService.updateProject(projectId!, { status: 'editing_content' });
          
          const editedChapters = await generationService.checkGrammar(chapters, validatedInput.language);

          // Phase 5: Finalize (100%)
          updateProgress('finalizing', 100);
          await pbService.updateProject(projectId!, { 
            status: 'completed',
            progress: 100 
          });

          const result = {
            id: projectId,
            title: enhancedPrompt.title || 'Generated eBook',
            chapters: editedChapters,
            metadata: {
              language: validatedInput.language,
              wordCount: editedChapters.reduce((sum, ch) => sum + ch.wordCount, 0),
              chapterCount: editedChapters.length,
              generatedAt: new Date().toISOString(),
              duration: Date.now() - startTime,
            },
          };

          // Send final result
          const finalData = JSON.stringify({
            type: 'completed',
            result,
            projectId,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

          logger.info('Generation completed successfully', {
            projectId,
            duration: Date.now() - startTime,
            wordCount: result.metadata.wordCount,
            chapters: result.metadata.chapterCount,
          });

        } catch (error: any) {
          logger.error('Generation failed', {
            error: error.message,
            stack: error.stack,
            projectId,
            duration: Date.now() - startTime,
          });

          // Update project status
          if (projectId) {
            await pbService.updateProject(projectId, {
              status: 'failed',
              error: error.message,
            }).catch(console.error);
          }

          const errorData = JSON.stringify({
            type: 'error',
            error: {
              message: error.message,
              code: error.code || 'GENERATION_FAILED',
            },
            projectId,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: any) {
    logger.error('API request failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}