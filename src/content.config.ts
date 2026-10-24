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

// A diagram stands in for a source link: the architecture is the part worth
// showing, and it reads on a phone where a repo does not. Like a screenshot,
// it needs alt text - an SVG's own <title> is not read out when it is an <img>.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        summary: z.string(),
        // Lower first. Ties sort by title.
        order: z.number().int(),
        url: z.url().optional(),
        repo: z.url().optional(),
        diagram: image().optional(),
        diagramAlt: z.string().optional(),
      })
      .refine((p) => !p.diagram || p.diagramAlt, { message: 'a diagram needs diagramAlt' }),
});

// Gigs I've been to. One Markdown file per show; the body is a few words
// about it. A photo is optional, but like the anime screenshots it needs alt
// text.
const gigs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gigs' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        // YAML reads an unquoted 2026-10-22 as a Date; take either form.
        date: z.preprocess(
          (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d),
          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
        ),
        // Optional: older photos don't always say where they were taken.
        venue: z.string().optional(),
        photo: image().optional(),
        photoAlt: z.string().optional(),
      })
      .refine((g) => !g.photo || g.photoAlt, { message: 'a photo needs photoAlt' }),
});

export const collections = { anime, projects, gigs };
