'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { PerformanceMonitor } from '@/components/performance-monitor';
import { initializeI18n } from '@/lib/i18n';

// Performance-optimized QueryClient
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
          if (error?.status === 404 || error?.status === 401) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);
  const [i18n, setI18n] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize i18n
    initializeI18n().then((i18nInstance) => {
      setI18n(i18nInstance);
      setMounted(true);
    });

    // Performance monitoring
    if (process.env.NODE_ENV === 'production') {
      // Track memory usage
      const checkMemory = () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          if (memory.usedJSHeapSize / memory.totalJSHeapSize > 0.9) {
            console.warn('High memory usage detected:', {
              used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
              total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            });
          }
        }
      };

      const memoryInterval = setInterval(checkMemory, 30000); // Check every 30s
      return () => clearInterval(memoryInterval);
    }
  }, []);

  // Prevent hydration mismatch
  if (!mounted || !i18n) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="ai-ebook-creator-theme"
      >
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <PerformanceMonitor>
              {children}
            </PerformanceMonitor>
            <Toaster />
          </QueryClientProvider>
        </I18nextProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}