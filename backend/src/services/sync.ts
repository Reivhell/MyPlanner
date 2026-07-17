import { db } from '../db/index.js';
import { documents, graphNodes } from '@planner/shared';
import { eq, and } from 'drizzle-orm';
import type { Document } from '@planner/shared';
import { documentService } from './documents.js';
import { aiService } from './ai.js';
import { graphService } from './graph.js';

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export const syncService = {
  outOfSyncStages(projectId: string): Document['stage'][] {
    return documentService.outOfSyncStages(projectId);
  },

  /** Re-run generation for every out-of-sync document (spec.md §10). */
  async regenerateOutOfSync(projectId: string) {
    const stages = this.outOfSyncStages(projectId);
    const runs = [];
    if (stages.includes('prd')) {
      runs.push(await aiService.dispatchGeneration(projectId, 'prd'));
    }
    if (stages.includes('specification') || stages.includes('architecture')) {
      // Spec generation regenerates both specification and architecture.
      runs.push(await aiService.dispatchGeneration(projectId, 'specification'));
    }
    return materialize(runs);
  },

  /**
   * Reflect edited document structure back into the Planning Graph
   * (spec.md §10, Documents → Graph). Creates one graph node per document
   * section (idempotent by label) so the graph does not go stale.
   */
  reflectToGraph(projectId: string): { created: number; nodes: ReturnType<typeof graphService.getNodes> } {
    const docs = documentService.listByProject(projectId);
    const existing = graphService.getNodes(projectId).map((n) => n.label.toLowerCase());
    let created = 0;
    for (const doc of docs) {
      for (const section of Object.keys(doc.content)) {
        const label = section.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (!existing.includes(label.toLowerCase())) {
          graphService.addNode(projectId, { label, type: 'feature', x: 0, y: 0 });
          existing.push(label.toLowerCase());
          created++;
        }
      }
    }
    return { created, nodes: graphService.getNodes(projectId) };
  },
};
