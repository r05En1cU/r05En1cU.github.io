import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  })
});

const progress = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/progress' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    status: z.enum(['idea', 'active', 'paused', 'done']).default('active'),
    project: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  })
});

export const collections = { blog, progress };