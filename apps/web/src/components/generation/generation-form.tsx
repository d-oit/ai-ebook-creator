'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, Link, FileText, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import type { EBookInput } from '@/types';

const GenerationFormSchema = z.object({
  type: z.enum(['topic', 'link', 'incomplete_book']),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must not exceed 5000 characters'),
  language: z.enum(['en', 'de']),
  tone: z.enum(['academic', 'casual', 'professional']).optional(),
  targetLength: z.number().min(1000).max(50000).optional(),
});

type FormData = z.infer<typeof GenerationFormSchema>;

interface GenerationFormProps {
  onSubmit: (data: EBookInput) => Promise<void>;
  disabled?: boolean;
  onReset?: () => void;
}

const inputTypes = [
  {
    value: 'topic' as const,
    label: 'Topic',
    icon: BookOpen,
    description: 'Generate from a topic or subject',
    placeholder: 'e.g., "Machine Learning for Beginners" or "Sustainable Energy Solutions"',
  },
  {
    value: 'link' as const,
    label: 'Link',
    icon: Link,
    description: 'Generate from a web link or URL',
    placeholder: 'https://example.com/article-about-topic',
  },
  {
    value: 'incomplete_book' as const,
    label: 'Incomplete Book',
    icon: FileText,
    description: 'Complete an existing draft',
    placeholder: 'Paste your existing content here...',
  },
];

export function GenerationForm({ onSubmit, disabled = false, onReset }: GenerationFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<'topic' | 'link' | 'incomplete_book'>('topic');

  const form = useForm<FormData>({
    resolver: zodResolver(GenerationFormSchema),
    defaultValues: {
      type: 'topic',
      content: '',
      language: 'en',
      tone: 'casual',
      targetLength: 15000,
    },
  });

  const handleSubmit = async (data: FormData) => {
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        targetLength: data.targetLength || 15000,
        tone: data.tone || 'casual',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setSelectedType('topic');
    onReset?.();
  };

  const currentType = inputTypes.find(type => type.value === selectedType);
  const contentLength = form.watch('content')?.length || 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Input Type Selection */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                {t('form.inputType.label')}
              </FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedType(value as typeof selectedType);
                    form.setValue('content', '');
                  }}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  {inputTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <motion.div
                        key={type.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card className={`cursor-pointer transition-all hover:shadow-md ${
                          field.value === type.value 
                            ? 'ring-2 ring-primary border-primary' 
                            : 'hover:border-primary/50'
                        }`}>
                          <CardContent className="p-4">
                            <RadioGroupItem
                              value={type.value}
                              id={type.value}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={type.value}
                              className="flex cursor-pointer flex-col items-center space-y-2 text-center"
                            >
                              <Icon className="h-6 w-6 text-primary" />
                              <span className="font-medium">{type.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {type.description}
                              </span>
                            </Label>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content Input */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                {t('form.content.label')}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Textarea
                    {...field}
                    placeholder={currentType?.placeholder}
                    className="min-h-[120px] resize-y"
                    disabled={disabled || isSubmitting}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {contentLength}/5000
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Language and Settings */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.language.label')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.tone.label')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="casual">{t('form.tone.casual')}</SelectItem>
                    <SelectItem value="professional">{t('form.tone.professional')}</SelectItem>
                    <SelectItem value="academic">{t('form.tone.academic')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={disabled || isSubmitting}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('form.reset')}
          </Button>
          
          <Button
            type="submit"
            disabled={disabled || isSubmitting || !form.formState.isValid}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('form.generating')}
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                {t('form.generate')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}