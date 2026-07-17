import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@planner/shared';

const DB_PATH = process.env.DATABASE_URL || './data/local.db';
const client = new Database(DB_PATH);
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema });

/** Re-export so callers use the same schema reference the client was initialized with. */
export { schema };
