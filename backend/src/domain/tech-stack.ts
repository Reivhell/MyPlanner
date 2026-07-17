export interface StackCategory {
  category: string;
  label: string;
  suggestions: string[];
}

/** The complete set of known tech-stack categories (spec: detectGaps). */
export const STACK_CATEGORIES: StackCategory[] = [
  { category: 'frontend', label: 'Frontend Framework', suggestions: ['SvelteKit', 'Next.js', 'React + Vite', 'Nuxt'] },
  { category: 'backend', label: 'Backend Framework', suggestions: ['Hono', 'Express', 'Fastify', 'Next.js API'] },
  { category: 'database', label: 'Database', suggestions: ['SQLite', 'PostgreSQL', 'MongoDB', 'Supabase'] },
  { category: 'orm', label: 'ORM', suggestions: ['Drizzle', 'Prisma', 'TypeORM', 'Knex'] },
  { category: 'styling', label: 'Styling', suggestions: ['Tailwind CSS', 'CSS Modules', 'Styled Components'] },
  { category: 'auth', label: 'Authentication', suggestions: ['None (local-only)', 'Auth.js', 'Clerk', 'Lucia'] },
  { category: 'state', label: 'State Management', suggestions: ['Svelte stores', 'Zustand', 'Redux', 'Pinia'] },
  { category: 'testing', label: 'Testing', suggestions: ['Vitest', 'Jest', 'Playwright', 'Cypress'] },
  { category: 'ai', label: 'AI / LLM', suggestions: ['OmniRoute', 'OpenAI SDK', 'Anthropic SDK', 'Custom'] },
  { category: 'deploy', label: 'Deployment', suggestions: ['Vercel', 'Docker', 'Railway', 'Self-hosted'] },
];

export const STACK_CATEGORY_KEYS = STACK_CATEGORIES.map((c) => c.category);

/** Categories not yet specified in the chosen components. */
export function findMissingComponents(components: Record<string, string>): StackCategory[] {
  return STACK_CATEGORIES.filter((c) => !components[c.category]);
}

/** Categories not yet specified, as plain keys (spec: detectGaps). */
export function detectGaps(components: Record<string, string>): string[] {
  return STACK_CATEGORY_KEYS.filter((k) => !components[k]);
}

/** Three complete, opinionated stack options (deterministic, offline-safe). */
export function recommendStacks(): Record<string, string>[] {
  return [
    {
      frontend: 'SvelteKit',
      backend: 'Hono',
      database: 'SQLite',
      orm: 'Drizzle',
      styling: 'Tailwind CSS',
      auth: 'None (local-only)',
      state: 'Svelte stores',
      testing: 'Vitest',
      ai: 'OmniRoute',
      deploy: 'Self-hosted',
    },
    {
      frontend: 'Next.js',
      backend: 'Hono',
      database: 'PostgreSQL',
      orm: 'Prisma',
      styling: 'Tailwind CSS',
      auth: 'Auth.js',
      state: 'Zustand',
      testing: 'Playwright',
      ai: 'OmniRoute',
      deploy: 'Vercel',
    },
    {
      frontend: 'React + Vite',
      backend: 'Express',
      database: 'MongoDB',
      orm: 'Mongoose',
      styling: 'Tailwind CSS',
      auth: 'Lucia',
      state: 'Redux',
      testing: 'Jest',
      ai: 'OpenAI SDK',
      deploy: 'Railway',
    },
  ];
}
