import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/api/src/db/schema.ts',
  out: './packages/api/src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
} satisfies Config;
