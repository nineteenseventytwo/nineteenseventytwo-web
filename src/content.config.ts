import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Typed frontmatter is the reason this is Astro rather than Hugo (ADR-0018,
// W2): a malformed entry fails the build instead of rendering half a card.

// One Markdown file per title. The body is the one paragraph; frontmatter
// carries the rest. Watched entries get a screenshot and a quote; to-watch
// entries are just a title and year.
//
// Screenshots are used for criticism and review, which is what makes them
// fair to use - so every one carries its title and year as a credit, and
// there is at most one per entry (plan 09, W.3).
const anime = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/anime' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        year: z.number().int().min(1960).max(2100),
        status: z.enum(['watched', 'to-watch']),
        quote: z.string().optional(),
        screenshot: image().optional(),
        screenshotAlt: z.string().optional(),
      })
      .refine((a) => !a.screenshot || a.screenshotAlt, {
        message: 'a screenshot needs screenshotAlt',
      })
      .refine((a) => a.status === 'watched' || (!a.screenshot && !a.quote), {
        message: 'to-watch entries carry no screenshot or quote',
      }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // Lower first. Ties sort by title.
    order: z.number().int(),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
  }),
});

export const collections = { anime, projects };
