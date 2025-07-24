// Import utilities from `astro:content`
import { defineCollection } from 'astro:content';
import { blogSchema } from '../schemas/blogSchema';
import { authorSchema } from '../schemas/authorSchema';
import { projetSchema } from '../schemas/projetSchema';

// Define Collections
const blogCollection = defineCollection({
  type: 'content',
  schema: blogSchema
});

const projetCollection = defineCollection({
  type: 'content',
  schema: projetSchema
});

const authorCollection = defineCollection({
  type: 'data',
  schema: authorSchema
});

export const collections = { 
  'blog': blogCollection,
  'authors': authorCollection,
  'projets': projetCollection 
};