'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProgressTrackerProps {
  progress: number;
  currentTask: string;
  isActive: boolean;
  error?: string;
  estimatedTimeRemaining?: number;
}

interface ProgressStage {
  id: string;
  name: string;
  minProgress: number;
  maxProgress: number;
  icon: React.ComponentType<{ className?: string }>;
}

const progressStages: ProgressStage[] = [
  {
    id: 'enhancing_prompt',
    name: 'Enhancing Prompt',
    minProgress: 0,
    maxProgress: 15,
    icon: Circle,
  },
  {
    id: 'planning_content',
    name: 'Planning Content',
    minProgress: 15,
    maxProgress: 30,
    icon: Circle,
  },
  {
    id: 'generating_chapters',
    name: 'Generating Chapters',
    minProgress: 30,
    maxProgress: 80,
    icon: Circle,
  },
  {
    id: 'checking_grammar',
    name: 'Checking Grammar',
    minProgress: 80,
    maxProgress: 95,
    icon: Circle,
  },
  {
    id: 'finalizing',
    name: 'Finalizing',
    minProgress: 95,
    maxProgress: 100,
    icon: Circle,
  },
];

function getStageStatus(stage: ProgressStage, currentProgress: number) {
  if (currentProgress >= stage.maxProgress) {
    return 'completed';
  } else if (currentProgress >= stage.minProgress) {
    return 'active';
  } else {
    return 'pending';
  }
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${Math.round(remainingSeconds)}s`;
}

export function ProgressTracker({
  progress,
  currentTask,
  isActive,
  error,
  estimatedTimeRemaining,
}: ProgressTrackerProps) {
  const { t } = useTranslation();
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const timer = setInterval(() => {
      setSmoothProgress((prev) => {
        const diff = progress - prev;
        return prev + diff * 0.1; // Smooth animation
      });
    }, 50);

    return () => clearInterval(timer);
  }, [progress]);

  // Track elapsed time
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, startTime]);

  const currentStage = progressStages.find(stage => 
    progress >= stage.minProgress && progress < stage.maxProgress
  ) || progressStages[progressStages.length - 1];

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : error ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {t('progress.title')}
          </CardTitle>
          <Badge variant={error ? 'destructive' : isActive ? 'default' : 'secondary'}>
            {Math.round(smoothProgress)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              {currentTask || currentStage?.name || t('progress.starting')}
            </span>
            <span className="text-muted-foreground">
              {elapsedTime > 0 && formatTimeRemaining(elapsedTime / 1000)}
            </span>
          </div>
          <Progress 
            value={smoothProgress} 
            className="h-2" 
            aria-label={`Progress: ${Math.round(smoothProgress)}%`}
          />
        </div>

        {/* Stage Indicators */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('progress.stages')}
          </h4>
          <div className="space-y-2">
            {progressStages.map((stage, index) => {
              const status = getStageStatus(stage, progress);
              const StageIcon = status === 'completed' ? CheckCircle : 
                              status === 'active' ? Loader2 : Circle;
              
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0">
                    <StageIcon 
                      className={`h-4 w-4 ${
                        status === 'completed' 
                          ? 'text-green-500' 
                          : status === 'active'
                          ? 'text-primary animate-spin'
                          : 'text-muted-foreground/50'
                      }`}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      status === 'completed'
                        ? 'text-green-600 dark:text-green-400'
                        : status === 'active'
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {t(`progress.stages.${stage.id}`, { defaultValue: stage.name })}
                    </p>
                  </div>
                  
                  {status === 'active' && (
                    <Badge variant="outline" className="text-xs">
                      {t('progress.active')}
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-md border border-destructive/20 bg-destructive/10 p-3"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-destructive">
                    {t('progress.error.title')}
                  </h5>
                  <p className="text-xs text-destructive/80 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estimated Time */}
        {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {t('progress.estimated')}: {formatTimeRemaining(estimatedTimeRemaining)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}