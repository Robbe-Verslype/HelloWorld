import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Elke map in src/content/designs/ is één design.
// In die map staat een index.md (tekst) + de foto's.
const designs = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/designs' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number(),
      client: z.string().optional(),
      role: z.string().optional(),
      tags: z.array(z.string()).default([]),
      // De afbeelding die als thumbnail op de hoop valt
      thumbnail: image(),
      // Achtergrondkleur van de case-pagina (optioneel)
      color: z.string().default('#f1efe9'),
      // Zet op true om een design te verbergen zonder het te verwijderen
      draft: z.boolean().default(false),
    }),
});

export const collections = { designs };
