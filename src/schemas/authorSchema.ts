import { z } from 'astro:content';

export const authorSchema = z.object({
  name: z.string(),
  image: z.string().optional(),
})