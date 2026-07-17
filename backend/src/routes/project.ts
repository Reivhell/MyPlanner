import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as projectService from '../services/project.js';

export const projectRouter = new Hono();

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  idea: z.string().min(1, 'Idea is required'),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  idea: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  currentStepData: z.record(z.unknown()).optional().nullable(),
});

const advanceSchema = z.object({
  status: z.enum([
    'idea',
    'interview',
    'stack',
    'planning',
    'specification',
    'tasks',
    'completed',
  ]),
});

// --- List ---
projectRouter.get('/projects', (c) => {
  const rows = projectService.listProjects();
  return c.json({ data: rows });
});

// --- Create ---
projectRouter.post('/projects', zValidator('json', createSchema), (c) => {
  const body = c.req.valid('json');
  const project = projectService.createProject(body);
  return c.json({ data: project }, 201);
});

// --- Get by ID ---
projectRouter.get('/projects/:id', (c) => {
  const id = c.req.param('id');
  try {
    const project = projectService.getProject(id);
    return c.json({ data: project });
  } catch (e) {
    if (e instanceof projectService.NotFoundError) {
      return c.json({ error: 'Project not found' }, 404);
    }
    throw e;
  }
});

// --- Update ---
projectRouter.patch('/projects/:id', zValidator('json', updateSchema), (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  try {
    const project = projectService.updateProject(id, body);
    return c.json({ data: project });
  } catch (e) {
    if (e instanceof projectService.NotFoundError) {
      return c.json({ error: 'Project not found' }, 404);
    }
    throw e;
  }
});

// --- Delete ---
projectRouter.delete('/projects/:id', (c) => {
  const id = c.req.param('id');
  try {
    projectService.deleteProject(id);
    return c.json({ data: null });
  } catch (e) {
    if (e instanceof projectService.NotFoundError) {
      return c.json({ error: 'Project not found' }, 404);
    }
    throw e;
  }
});

// --- Advance status ---
projectRouter.post('/projects/:id/advance', zValidator('json', advanceSchema), (c) => {
  const id = c.req.param('id');
  const { status } = c.req.valid('json');
  try {
    const project = projectService.advanceProjectStatus(id, status);
    return c.json({ data: project });
  } catch (e) {
    if (e instanceof projectService.NotFoundError) {
      return c.json({ error: 'Project not found' }, 404);
    }
    if (e instanceof projectService.InvalidTransitionError) {
      return c.json({ error: e.message }, 400);
    }
    throw e;
  }
});

// --- Resume cursor ---
projectRouter.get('/projects/:id/resume', (c) => {
  const id = c.req.param('id');
  try {
    const cursor = projectService.getResumeCursor(id);
    return c.json({ data: cursor });
  } catch (e) {
    if (e instanceof projectService.NotFoundError) {
      return c.json({ error: 'Project not found' }, 404);
    }
    throw e;
  }
});
