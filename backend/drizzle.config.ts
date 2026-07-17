import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../packages/shared/src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/local.db',
  },
});
