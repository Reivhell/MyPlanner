import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { settingsService } from '../services/settings.js';

export const settingsRouter = new Hono();

settingsRouter.get('/settings', async (c) => {
  const all = await settingsService.getAll();
  return c.json({ data: all });
});

settingsRouter.get('/settings/:key', async (c) => {
  const value = await settingsService.get(c.req.param('key'));
  if (value === undefined) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: value });
});

const setSchema = z.object({
  value: z.string(),
});

settingsRouter.put('/settings/:key', zValidator('json', setSchema), async (c) => {
  const { value } = c.req.valid('json');
  await settingsService.set(c.req.param('key'), value);
  return c.json({ data: { key: c.req.param('key'), value } });
});

const setManySchema = z.object({
  settings: z.record(z.string()),
});

settingsRouter.put('/settings', zValidator('json', setManySchema), async (c) => {
  const { settings } = c.req.valid('json');
  await settingsService.setMany(settings);
  const all = await settingsService.getAll();
  return c.json({ data: all });
});
