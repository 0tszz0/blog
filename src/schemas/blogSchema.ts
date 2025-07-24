import { z, reference } from "astro:content";

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  author: reference("authors"),
  image: z.string().optional(),
  tags: z.array(z.string()),
  updatedDate: z.date().optional(),
  draft: z.boolean(),
  lang: z.string(),
  // canonicalURL: z.string().url(),
});
