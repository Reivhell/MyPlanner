import { db } from '../db/index.js';
import { documents } from '@planner/shared';
import { eq, and } from 'drizzle-orm';
import type { Document, DocumentContent } from '@planner/shared';

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export const documentService = {
  listByProject(projectId: string): Document[] {
    return materialize(
      db
        .select()
        .from(documents)
        .where(eq(documents.projectId, projectId))
        .all()
    );
  },

  getByStage(projectId: string, stage: Document['stage']): Document | undefined {
    const row = db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.stage, stage)))
      .get();
    return row ? materialize(row) : undefined;
  },

  /** Insert or replace the document for a stage (one canonical doc per stage). */
  upsert(
    projectId: string,
    stage: Document['stage'],
    content: DocumentContent,
    generationRunId: string,
    isOutOfSync = false
  ): Document {
    const existing = this.getByStage(projectId, stage);
    const now = new Date().toISOString();
    if (existing) {
      const row = db
        .update(documents)
        .set({
          content,
          generationRunId,
          isOutOfSync,
          updatedAt: now,
        })
        .where(eq(documents.id, existing.id))
        .returning()
        .get();
      return materialize(row);
    }
    const row = db
      .insert(documents)
      .values({
        projectId,
        stage,
        content,
        generationRunId,
        isOutOfSync,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return materialize(row);
  },

  updateContent(projectId: string, stage: Document['stage'], content: DocumentContent): Document {
    const existing = this.getByStage(projectId, stage);
    if (!existing) throw new Error(`No ${stage} document to update`);
    const row = db
      .update(documents)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, existing.id))
      .returning()
      .get();
    return materialize(row);
  },

  /** Graph edits flag downstream docs as out of sync (spec.md §10). */
  markOutOfSync(projectId: string, stages: Document['stage'][] = ['prd', 'specification', 'architecture']): void {
    for (const stage of stages) {
      db.update(documents)
        .set({ isOutOfSync: true })
        .where(and(eq(documents.projectId, projectId), eq(documents.stage, stage)))
        .run();
    }
  },

  clearOutOfSync(projectId: string): void {
    db.update(documents)
      .set({ isOutOfSync: false })
      .where(eq(documents.projectId, projectId))
      .run();
  },

  outOfSyncStages(projectId: string): Document['stage'][] {
    return this.listByProject(projectId)
      .filter((d) => d.isOutOfSync)
      .map((d) => d.stage);
  },
};
