import { db } from '../db/index.js';
import { settings } from '@planner/shared';
import { eq } from 'drizzle-orm';

export interface AppSettings {
  omnirouteUrl: string;
  omnirouteApiKey: string;
  aiMode: 'mock' | 'real';
  aiConcurrency: number;
  n8nWebhookUrl: string;
}

const DEFAULTS: AppSettings = {
  omnirouteUrl: process.env.OMNIROUTE_URL || 'https://api.omniroute.ai/v1',
  omnirouteApiKey: process.env.OMNIROUTE_API_KEY || '',
  aiMode: (process.env.AI_MODE as 'mock' | 'real') || 'mock',
  aiConcurrency: parseInt(process.env.AI_CONCURRENCY || '3', 10) || 3,
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
};

let cache: { value: AppSettings; at: number } | null = null;
const TTL = 5_000;

export class SettingsError extends Error {}

export const settingsService = {
  async get(key: string): Promise<string | undefined> {
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value;
  },

  async getAll(): Promise<AppSettings> {
    if (cache && Date.now() - cache.at < TTL) return cache.value;
    const rows = db.select().from(settings).all();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const merged: AppSettings = {
      omnirouteUrl: map.omnirouteUrl || DEFAULTS.omnirouteUrl,
      omnirouteApiKey: map.omnirouteApiKey || DEFAULTS.omnirouteApiKey,
      aiMode: (map.aiMode as 'mock' | 'real') || DEFAULTS.aiMode,
      aiConcurrency: map.aiConcurrency ? parseInt(map.aiConcurrency, 10) : DEFAULTS.aiConcurrency,
      n8nWebhookUrl: map.n8nWebhookUrl || DEFAULTS.n8nWebhookUrl,
    };
    cache = { value: merged, at: Date.now() };
    return merged;
  },

  async set(key: string, value: string): Promise<void> {
    cache = null;
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  },

  async setMany(entries: Record<string, string>): Promise<void> {
    cache = null;
    for (const [key, value] of Object.entries(entries)) {
      db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
    }
  },
};
