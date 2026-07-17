import { Hono } from 'hono';
import { syncService } from '../services/sync.js';
import { projectService } from '../services/project.js';

export const syncRouter = new Hono();

syncRouter.get('/projects/:projectId/sync', (c) => {
  const stages = syncService.outOfSyncStages(c.req.param('projectId'));
  return c.json({ data: { outOfSync: stages } });
});

syncRouter.post('/projects/:projectId/sync/regenerate', async (c) => {
  try {
    projectService.getProject(c.req.param('projectId'));
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
  const runs = await syncService.regenerateOutOfSync(c.req.param('projectId'));
  return c.json({ data: { runs } }, 202);
});

syncRouter.post('/projects/:projectId/sync/reflect', (c) => {
  const result = syncService.reflectToGraph(c.req.param('projectId'));
  return c.json({ data: result });
});
