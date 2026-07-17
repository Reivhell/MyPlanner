import { db } from '../db/index.js';
import { graphNodes, graphEdges } from '@planner/shared';
import { eq, and } from 'drizzle-orm';
import type { GraphNode, GraphEdge } from '@planner/shared';
import { documentService } from './documents.js';
import { isNodeType, isValidEdge } from '../domain/graph.js';

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export class GraphError extends Error {}

export const graphService = {
  getNodes(projectId: string): GraphNode[] {
    return materialize(
      db.select().from(graphNodes).where(eq(graphNodes.projectId, projectId)).all()
    );
  },

  getEdges(projectId: string): GraphEdge[] {
    return materialize(
      db.select().from(graphEdges).where(eq(graphEdges.projectId, projectId)).all()
    );
  },

  getGraph(projectId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: this.getNodes(projectId),
      edges: this.getEdges(projectId),
    };
  },

  /** Flag downstream docs as out of sync (spec.md §10). Called on every structural mutation. */
  markOutOfSync(projectId: string): void {
    documentService.markOutOfSync(projectId);
  },

  /**
   * Reconcile the full node/edge set written by the canvas (GoJS emits
   * whole-model transactions, so diffing per-event is fragile). Upserts nodes
   * by id and replaces edges for the project, validating edge endpoints.
   * ponytail: full replace per save; fine for a single-user local graph.
   */
  saveGraph(
    projectId: string,
    nodes: { id: string; label: string; type: string; x: number; y: number }[],
    edges: { sourceId: string; targetId: string }[]
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const existing = new Map(this.getNodes(projectId).map((n) => [n.id, n]));
    for (const n of nodes) {
      if (!n.label?.trim()) throw new GraphError('Node label is required');
      const type = isNodeType(n.type) ? n.type : 'feature';
      if (existing.has(n.id)) {
        db.update(graphNodes)
          .set({ label: n.label.trim(), type, x: n.x, y: n.y })
          .where(eq(graphNodes.id, n.id))
          .run();
      } else {
        db.insert(graphNodes)
          .values({ id: n.id, projectId, label: n.label.trim(), type, x: n.x, y: n.y })
          .run();
      }
    }
    const validIds = new Set(nodes.map((n) => n.id));
    const cleanEdges = edges.filter(
      (e) => validIds.has(e.sourceId) && validIds.has(e.targetId) && e.sourceId !== e.targetId
    );
    db.delete(graphEdges).where(eq(graphEdges.projectId, projectId)).run();
    for (const e of cleanEdges) {
      db.insert(graphEdges).values({ projectId, sourceId: e.sourceId, targetId: e.targetId }).run();
    }
    this.markOutOfSync(projectId);
    return this.getGraph(projectId);
  },

  addNode(
    projectId: string,
    data: { label: string; type: string; x: number; y: number }
  ): GraphNode {
    if (!data.label?.trim()) throw new GraphError('Node label is required');
    const type = isNodeType(data.type) ? data.type : 'feature';
    const row = db
      .insert(graphNodes)
      .values({ projectId, label: data.label.trim(), type, x: data.x, y: data.y })
      .returning()
      .get();
    documentService.markOutOfSync(projectId);
    return materialize(row);
  },

  /** Patch a node: label, type, or position (any subset). */
  updateNode(
    nodeId: string,
    data: { label?: string; type?: string; x?: number; y?: number }
  ): GraphNode {
    const set: Record<string, unknown> = {};
    if (data.label !== undefined) {
      if (!data.label?.trim()) throw new GraphError('Node label is required');
      set.label = data.label.trim();
    }
    if (data.type !== undefined) {
      set.type = isNodeType(data.type) ? data.type : 'feature';
    }
    if (data.x !== undefined) set.x = data.x;
    if (data.y !== undefined) set.y = data.y;
    if (Object.keys(set).length === 0) {
      const existing = db.select().from(graphNodes).where(eq(graphNodes.id, nodeId)).get();
      if (!existing) throw new GraphError('Node not found');
      return materialize(existing);
    }
    const row = db
      .update(graphNodes)
      .set(set)
      .where(eq(graphNodes.id, nodeId))
      .returning()
      .get();
    if (!row) throw new GraphError('Node not found');
    return materialize(row);
  },

  deleteNode(nodeId: string): void {
    const node = db.select().from(graphNodes).where(eq(graphNodes.id, nodeId)).get();
    if (!node) throw new GraphError('Node not found');
    db.delete(graphEdges)
      .where(and(eq(graphEdges.sourceId, nodeId), eq(graphEdges.projectId, node.projectId)))
      .run();
    db.delete(graphEdges)
      .where(and(eq(graphEdges.targetId, nodeId), eq(graphEdges.projectId, node.projectId)))
      .run();
    db.delete(graphNodes).where(eq(graphNodes.id, nodeId)).run();
    documentService.markOutOfSync(node.projectId);
  },

  addEdge(projectId: string, sourceId: string, targetId: string): GraphEdge {
    if (!isValidEdge(sourceId, targetId)) throw new GraphError('Invalid edge endpoints');
    const source = db.select().from(graphNodes).where(eq(graphNodes.id, sourceId)).get();
    const target = db.select().from(graphNodes).where(eq(graphNodes.id, targetId)).get();
    if (!source || !target) throw new GraphError('Edge endpoints must be existing nodes');
    if (source.projectId !== projectId || target.projectId !== projectId) {
      throw new GraphError('Edge endpoints must belong to this project');
    }
    const dup = db
      .select()
      .from(graphEdges)
      .where(
        and(
          eq(graphEdges.projectId, projectId),
          eq(graphEdges.sourceId, sourceId),
          eq(graphEdges.targetId, targetId)
        )
      )
      .get();
    if (dup) throw new GraphError('Edge already exists');
    const row = db
      .insert(graphEdges)
      .values({ projectId, sourceId, targetId })
      .returning()
      .get();
    documentService.markOutOfSync(projectId);
    return materialize(row);
  },

  deleteEdge(edgeId: string): void {
    const edge = db.select().from(graphEdges).where(eq(graphEdges.id, edgeId)).get();
    if (!edge) throw new GraphError('Edge not found');
    db.delete(graphEdges).where(eq(graphEdges.id, edgeId)).run();
    documentService.markOutOfSync(edge.projectId);
  },

  /**
   * Layered left-to-right layout via topological sort (spec 5.2).
   * Nodes are bucketed into depth layers by longest path from a root;
   * cycles fall back to a grid so every node still gets a position.
   * ponytail: O(V*(V+E)) single-source longest-path; fine for planning graphs.
   */
  autoLayout(projectId: string): GraphNode[] {
    const nodes = this.getNodes(projectId);
    if (nodes.length === 0) return [];
    const edges = this.getEdges(projectId);
    const adj = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    for (const n of nodes) {
      adj.set(n.id, []);
      indeg.set(n.id, 0);
    }
    for (const e of edges) {
      if (!adj.has(e.sourceId) || !indeg.has(e.targetId)) continue;
      adj.get(e.sourceId)!.push(e.targetId);
      indeg.set(e.targetId, (indeg.get(e.targetId) ?? 0) + 1);
    }

    // Longest-path layering (Kahn over reversed edge direction).
    const depth = new Map<string, number>();
    const queue: string[] = [];
    for (const n of nodes) {
      depth.set(n.id, 0);
      if ((indeg.get(n.id) ?? 0) === 0) queue.push(n.id);
    }
    let processed = 0;
    while (queue.length) {
      const id = queue.shift()!;
      processed++;
      for (const next of adj.get(id) ?? []) {
        depth.set(next, Math.max(depth.get(next) ?? 0, (depth.get(id) ?? 0) + 1));
        indeg.set(next, (indeg.get(next) ?? 0) - 1);
        if ((indeg.get(next) ?? 0) === 0) queue.push(next);
      }
    }
    const hasCycle = processed < nodes.length;

    const spacingX = 280;
    const spacingY = 140;
    const startX = 40;
    const startY = 40;

    if (hasCycle) {
      // Fallback: simple grid keeps everything positioned and on-screen.
      const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        db.update(graphNodes)
          .set({ x: startX + (i % cols) * spacingX, y: startY + Math.floor(i / cols) * spacingY })
          .where(eq(graphNodes.id, n.id))
          .run();
      }
      return this.getNodes(projectId);
    }

    // Group nodes by layer, place each layer in a column left-to-right.
    const byLayer = new Map<number, string[]>();
    for (const n of nodes) {
      const d = depth.get(n.id) ?? 0;
      if (!byLayer.has(d)) byLayer.set(d, []);
      byLayer.get(d)!.push(n.id);
    }
    const updated: GraphNode[] = [];
    let depthKey = 0;
    const layers = [...byLayer.keys()].sort((a, b) => a - b);
    for (const layer of layers) {
      const ids = byLayer.get(layer)!;
      ids.forEach((id, rowIdx) => {
        const x = startX + depthKey * spacingX;
        const y = startY + rowIdx * spacingY;
        const r = db.update(graphNodes).set({ x, y }).where(eq(graphNodes.id, id)).returning().get();
        updated.push(materialize(r));
      });
      depthKey++;
    }
    this.markOutOfSync(projectId);
    return updated;
  },
};
