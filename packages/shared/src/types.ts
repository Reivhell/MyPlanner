import type { ProjectStatus, GenerationState, AiStage } from './constants';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  idea: string;
  status: ProjectStatus;
  currentStepData?: Record<string, unknown> | null;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/** A single modular document section: key (file name) -> markdown body. */
export type DocumentContent = Record<string, string>;

export interface InterviewAnswer {
  id: string;
  projectId: string;
  question: string;
  answer: string;
  order: number;
  createdAt: string;
}

export interface TechStack {
  id: string;
  projectId: string;
  // The confirmed stack as key-value pairs, e.g. { frontend: "SvelteKit", backend: "Hono", database: "SQLite" }
  components: Record<string, string>;
  // The mode that produced this stack: 'manual' or 'ai-recommended'
  mode: 'manual' | 'ai-recommended';
  createdAt: string;
}

export interface GraphNode {
  id: string;
  projectId: string;
  label: string;
  type: string; // e.g. 'feature', 'module', 'dependency'
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
}

export interface Document {
  id: string;
  projectId: string;
  stage: 'prd' | 'specification' | 'architecture';
  content: DocumentContent; // section key -> markdown body
  isOutOfSync: boolean;
  generationRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: number;
  order: number;
  group: string;
  generationRunId: string | null;
  createdAt: string;
}

export interface GenerationRun {
  id: string;
  projectId: string;
  stage: AiStage;
  state: GenerationState;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRecord {
  id: string;
  projectId: string;
  path: string;
  createdAt: string;
}

export interface Settings {
  key: string;
  value: string;
}
