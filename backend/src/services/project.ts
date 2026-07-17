import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { Project, ProjectStatus } from '@planner/shared';

const { projects } = schema;

/** Drizzle returns proxy objects that break spread/JSON serialization. Materialize via toJSON. */
function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const STATUS_ORDER: ProjectStatus[] = [
  'idea',
  'interview',
  'stack',
  'planning',
  'specification',
  'tasks',
  'completed',
];

export class NotFoundError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'NotFoundError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidTransitionError';
  }
}

function now() {
  return new Date().toISOString();
}

// ---- Queries ----

export function listProjects(): Project[] {
  return materialize(
    db.select().from(projects).orderBy(projects.updatedAt).all()
  );
}

export function getProject(id: string): Project {
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) throw new NotFoundError('Project not found');
  return materialize(row);
}

export function createProject(data: {
  name: string;
  idea: string;
  description?: string | null;
}): Project {
  const ts = now();
  const row = db
    .insert(projects)
    .values({
      name: data.name,
      idea: data.idea,
      description: data.description ?? null,
      status: 'idea',
      createdAt: ts,
      updatedAt: ts,
    })
    .returning()
    .get();
  if (!row) throw new Error('Insert returned no rows');
  return materialize(row);
}

export function updateProject(
  id: string,
  data: Partial<Pick<Project, 'name' | 'description' | 'idea' | 'currentStepData'>>
): Project {
  getProject(id); // throws if not found
  const row = db
    .update(projects)
    .set({ ...data, updatedAt: now() })
    .where(eq(projects.id, id))
    .returning()
    .get();
  if (!row) throw new NotFoundError('Project not found after update');
  return materialize(row);
}

export function deleteProject(id: string): void {
  getProject(id); // throws if not found
  db.delete(projects).where(eq(projects.id, id)).run();
}

// ---- State machine ----

export function advanceProjectStatus(
  id: string,
  newStatus: ProjectStatus
): Project {
  const project = getProject(id);
  const currentIdx = STATUS_ORDER.indexOf(project.status as ProjectStatus);
  const nextIdx = STATUS_ORDER.indexOf(newStatus);

  if (nextIdx === -1) {
    throw new InvalidTransitionError(`Invalid status: ${newStatus}`);
  }
  if (nextIdx !== currentIdx + 1) {
    throw new InvalidTransitionError(
      `Cannot transition from ${project.status} to ${newStatus}. Expected: ${STATUS_ORDER[currentIdx + 1] ?? '<terminal>'}`
    );
  }

  const row = db
    .update(projects)
    .set({ status: newStatus, updatedAt: now() })
    .where(eq(projects.id, id))
    .returning()
    .get();
  if (!row) throw new NotFoundError('Project not found');
  return materialize(row);
}

// ---- Resume ----

export function getResumeCursor(id: string) {
  const project = getProject(id);
  const idx = STATUS_ORDER.indexOf(project.status as ProjectStatus);
  return {
    step: project.status,
    stepNumber: idx + 1,
    stepData: project.currentStepData ?? null,
  };
}

/**
 * Advance to `target` only if it is exactly the next status. Used by
 * generation success handlers so re-generation (status already past the
 * trigger point) does not throw an InvalidTransitionError.
 */
export function advanceIfNext(id: string, target: ProjectStatus): Project {
  const project = getProject(id);
  const idx = STATUS_ORDER.indexOf(project.status as ProjectStatus);
  const nextIdx = STATUS_ORDER.indexOf(target);
  if (nextIdx === idx + 1) {
    return advanceProjectStatus(id, target);
  }
  return materialize(project);
}

export const projectService = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  advanceProjectStatus,
  getResumeCursor,
  advanceIfNext,
};

