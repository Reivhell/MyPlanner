import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const DB_PATH = process.env.DATABASE_URL || './data/local.db';
const client = new Database(DB_PATH);
const db = drizzle(client);

migrate(db, { migrationsFolder: './migrations' });
console.log('✅ Migrations applied');
client.close();
