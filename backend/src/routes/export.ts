import { Hono } from 'hono';
import { exportService } from '../services/export.js';
import { projectService, advanceIfNext } from '../services/project.js';

export const exportRouter = new Hono();

exportRouter.post('/projects/:projectId/export', async (c) => {
  const projectId = c.req.param('projectId');
  try {
    const result = await exportService.exportProject(projectId);
    const project = advanceIfNext(projectId, 'completed');
    return c.json({ data: { ...result, project } }, 201);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

exportRouter.get('/projects/:projectId/exports', (c) => {
  const list = exportService.listExports(c.req.param('projectId'));
  return c.json({ data: list });
});

exportRouter.get('/projects/:projectId/export/download', (c) => {
  const projectId = c.req.param('projectId');
  try {
    const zip = exportService.buildZip(projectId);
    const project = projectService.getProject(projectId);
    const name = (project.name || 'workspace').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return new Response(zip, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${name}-ai-workspace.zip"`,
      },
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});
