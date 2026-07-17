import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { graphService, GraphError } from '../services/graph.js';
import { projectService } from '../services/project.js';

export const graphRouter = new Hono();

function notFoundHandler(e: unknown, c: Context) {
  if (e instanceof GraphError) return c.json({ error: e.message }, 400);
  throw e;
}

graphRouter.get('/projects/:projectId/graph', (c) => {
  const projectId = c.req.param('projectId');
  try {
    projectService.getProject(projectId);
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
  return c.json({
    data: {
      nodes: graphService.getNodes(projectId),
      edges: graphService.getEdges(projectId),
    },
  });
});

const nodeSchema = z.object({
  label: z.string().min(1),
  type: z.string().default('feature'),
  x: z.number().default(0),
  y: z.number().default(0),
});

graphRouter.post(
  '/projects/:projectId/graph/nodes',
  zValidator('json', nodeSchema),
  (c) => {
    const projectId = c.req.param('projectId');
    try {
      const node = graphService.addNode(projectId, c.req.valid('json'));
      return c.json({ data: node }, 201);
    } catch (e) {
      return notFoundHandler(e, c);
    }
  }
);

const patchNodeSchema = z.object({
  label: z.string().min(1).optional(),
  type: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

graphRouter.patch(
  '/projects/:projectId/graph/nodes/:nodeId',
  zValidator('json', patchNodeSchema),
  (c) => {
    const projectId = c.req.param('projectId');
    const nodeId = c.req.param('nodeId');
    const body = c.req.valid('json');
    try {
      const node = graphService.updateNode(nodeId, body);
      return c.json({ data: node });
    } catch (e) {
      return notFoundHandler(e, c);
    }
  }
);

graphRouter.delete('/projects/:projectId/graph/nodes/:nodeId', (c) => {
  try {
    graphService.deleteNode(c.req.param('nodeId'));
    return c.json({ data: null });
  } catch (e) {
    return notFoundHandler(e, c);
  }
});

const edgeSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

graphRouter.post(
  '/projects/:projectId/graph/edges',
  zValidator('json', edgeSchema),
  (c) => {
    const projectId = c.req.param('projectId');
    try {
      const edge = graphService.addEdge(projectId, c.req.valid('json').sourceId, c.req.valid('json').targetId);
      return c.json({ data: edge }, 201);
    } catch (e) {
      return notFoundHandler(e, c);
    }
  }
);

graphRouter.delete('/projects/:projectId/graph/edges/:edgeId', (c) => {
  try {
    graphService.deleteEdge(c.req.param('edgeId'));
    return c.json({ data: null });
  } catch (e) {
    return notFoundHandler(e, c);
  }
});

graphRouter.post('/projects/:projectId/graph/auto-layout', (c) => {
  const projectId = c.req.param('projectId');
  graphService.autoLayout(projectId);
  return c.json({ data: graphService.getGraph(projectId) });
});

// Bulk reconcile from the canvas (load-and-save of full node/edge set).
const syncSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: z.string().default('feature'),
        x: z.number().default(0),
        y: z.number().default(0),
      })
    )
    .default([]),
  edges: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        targetId: z.string().min(1),
      })
    )
    .default([]),
});

graphRouter.post(
  '/projects/:projectId/graph/sync',
  zValidator('json', syncSchema),
  (c) => {
    const projectId = c.req.param('projectId');
    try {
      projectService.getProject(projectId);
    } catch {
      return c.json({ error: 'Project not found' }, 404);
    }
    const { nodes, edges } = c.req.valid('json');
    try {
      const graph = graphService.saveGraph(projectId, nodes, edges);
      return c.json({ data: graph });
    } catch (e) {
      return notFoundHandler(e, c);
    }
  }
);
