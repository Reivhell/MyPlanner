import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { techStackService } from '../services/tech-stack.js';
import { projectService } from '../services/project.js';
import { STACK_CATEGORIES, findMissingComponents } from '../domain/tech-stack.js';

export const techStackRouter = new Hono();

function loadProject(projectId: string) {
  try {
    return projectService.getProject(projectId);
  } catch {
    return null;
  }
}

techStackRouter.get('/projects/:projectId/tech-stack', (c) => {
  const projectId = c.req.param('projectId');
  const project = loadProject(projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const stack = techStackService.get(projectId);
  const components = stack?.components ?? {};
  const missing = findMissingComponents(components).map((m) => m.category);
  return c.json({ data: { stack: stack ?? null, categories: STACK_CATEGORIES, gaps: missing } });
});

const setSchema = z.object({ components: z.record(z.string()) });

techStackRouter.put(
  '/projects/:projectId/tech-stack',
  zValidator('json', setSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    if (!loadProject(projectId)) return c.json({ error: 'Project not found' }, 404);
    const { components } = c.req.valid('json');
    const stack = techStackService.set(projectId, components, 'manual');
    const gaps = techStackService.detectGaps(stack.components);
    return c.json({ data: { stack, gaps } });
  }
);

techStackRouter.post('/projects/:projectId/tech-stack/recommend', async (c) => {
  const projectId = c.req.param('projectId');
  const project = loadProject(projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const recommendations = await techStackService.recommend(projectId, project.idea);
  return c.json({ data: { recommendations } });
});

techStackRouter.get('/projects/:projectId/tech-stack/recommendations', (c) => {
  const projectId = c.req.param('projectId');
  if (!loadProject(projectId)) return c.json({ error: 'Project not found' }, 404);
  const recommendations = techStackService.getRecommendations(projectId);
  return c.json({ data: { recommendations } });
});

techStackRouter.post('/projects/:projectId/tech-stack/auto-complete', async (c) => {
  const projectId = c.req.param('projectId');
  const project = loadProject(projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const stack = await techStackService.autoComplete(projectId, project.idea);
  const gaps = techStackService.detectGaps(stack.components);
  return c.json({ data: { stack, gaps } });
});
