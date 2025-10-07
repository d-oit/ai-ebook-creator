'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GenerationForm } from '@/components/generation/generation-form';
import { ProgressTracker } from '@/components/generation/progress-tracker';
import { ResultDisplay } from '@/components/generation/result-display';
import { HeroSection } from '@/components/sections/hero-section';
import { FeaturesSection } from '@/components/sections/features-section';
import { useGenerationStore } from '@/store/generation-store';
import { logger } from '@core/utils/logger';
import type { EBookInput, GenerationResult } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export default function HomePage() {
  const { t } = useTranslation();
  const {
    isGenerating,
    progress,
    currentTask,
    result,
    error,
    startGeneration,
    reset,
  } = useGenerationStore();

  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async (input: EBookInput) => {
    try {
      logger.info('Starting eBook generation', { input });
      
      setShowResults(false);
      await startGeneration(input);
      
      // Show results when generation completes
      if (result && !error) {
        setShowResults(true);
      }
    } catch (err) {
      logger.error('Generation failed', { error: err, input });
    }
  };

  const handleReset = () => {
    reset();
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Main Content */}
      <motion.div
        className="container mx-auto px-4 py-12 lg:py-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Generation Form */}
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold text-card-foreground">
                  {t('generation.title')}
                </h2>
                
                <GenerationForm
                  onSubmit={handleGenerate}
                  disabled={isGenerating}
                  onReset={handleReset}
                />
              </div>
            </motion.div>

            {/* Progress and Results */}
            <motion.div variants={itemVariants} className="space-y-8">
              {/* Progress Tracker */}
              {isGenerating && (
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-medium text-card-foreground">
                    {t('generation.progress.title')}
                  </h3>
                  
                  <ProgressTracker
                    progress={progress}
                    currentTask={currentTask}
                    isActive={isGenerating}
                  />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-destructive/20 bg-destructive/10 p-6"
                >
                  <h3 className="mb-2 text-lg font-medium text-destructive">
                    {t('generation.error.title')}
                  </h3>
                  <p className="text-sm text-destructive/80">
                    {error.message || t('generation.error.generic')}
                  </p>
                </motion.div>
              )}

              {/* Results Display */}
              {showResults && result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <ResultDisplay result={result} />
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Features Section */}
      <FeaturesSection />
    </div>
  );
}