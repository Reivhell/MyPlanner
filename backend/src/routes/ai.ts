import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { aiService } from '../services/ai.js';
import { documentService } from '../services/documents.js';
import { projectService } from '../services/project.js';
import { tasks } from '@planner/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { AI_STAGES } from '@planner/shared';

export const aiRouter = new Hono();

const genSchema = z.object({
  stage: z.enum(AI_STAGES as unknown as [string, ...string[]]),
});

aiRouter.post('/projects/:projectId/generate', zValidator('json', genSchema), async (c) => {
  const projectId = c.req.param('projectId');
  try {
    projectService.getProject(projectId);
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
  const { stage } = c.req.valid('json');
  const run = await aiService.dispatchGeneration(projectId, stage as (typeof AI_STAGES)[number]);
  return c.json({ data: run }, 202);
});

aiRouter.get('/projects/:projectId/generations', async (c) => {
  const runs = await aiService.getRuns(c.req.param('projectId'));
  return c.json({ data: runs });
});

aiRouter.get('/generations/:runId', async (c) => {
  const run = await aiService.getRun(c.req.param('runId'));
  if (!run) return c.json({ error: 'Run not found' }, 404);
  return c.json({ data: run });
});

aiRouter.post('/generations/:runId/cancel', async (c) => {
  await aiService.cancelRun(c.req.param('runId'));
  return c.json({ data: null });
});

aiRouter.post('/generations/:runId/accept', async (c) => {
  try {
    const run = await aiService.acceptRun(c.req.param('runId'));
    return c.json({ data: run });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// ---- Documents ----

aiRouter.get('/projects/:projectId/documents', async (c) => {
  const docs = documentService.listByProject(c.req.param('projectId'));
  return c.json({ data: docs });
});

const docStage = z.enum(['prd', 'specification', 'architecture']);
const updateDocSchema = z.object({
  content: z.record(z.string()),
});

aiRouter.put(
  '/projects/:projectId/documents/:stage',
  zValidator('param', z.object({ stage: docStage })),
  zValidator('json', updateDocSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const stage = c.req.valid('param').stage;
    const { content } = c.req.valid('json');
    try {
      const doc = documentService.updateContent(projectId, stage, content);
      return c.json({ data: doc });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400);
    }
  }
);

// ---- Tasks ----

aiRouter.get('/projects/:projectId/tasks', async (c) => {
  const rows = db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, c.req.param('projectId')))
    .orderBy(tasks.order)
    .all();
  return c.json({ data: rows });
});
