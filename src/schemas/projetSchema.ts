import { z } from 'astro:content';

export const projetSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.date(),
  techStack: z.array(z.string()),
})