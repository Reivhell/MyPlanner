import type { Project, InterviewAnswer, TechStack, GraphNode, GraphEdge, Document, Task, GenerationRun, ExportRecord } from './types';
import type { ProjectStatus, AiStage } from './constants';

/** Standard API envelope */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/** Paginated list response */
export interface ListResponse<T> {
  data: T[];
  total: number;
}

// --- Project ---

export interface CreateProjectRequest {
  name: string;
  description?: string;
  idea: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  idea?: string;
}

export type CreateProjectResponse = ApiResponse<Project>;
export type ListProjectsResponse = ApiResponse<Project[]>;
export type GetProjectResponse = ApiResponse<Project>;
export interface UpdateProjectStatusRequest {
  status: ProjectStatus;
}
export type UpdateProjectStatusResponse = ApiResponse<Project>;

export interface AdvanceProjectStatusRequest {
  status: ProjectStatus;
}
export type AdvanceProjectStatusResponse = ApiResponse<Project>;

export type GetResumeCursorResponse = ApiResponse<{
  step: ProjectStatus;
  stepData?: Record<string, unknown> | null;
  stepNumber: number;
}>

// --- Interview ---

export interface CreateInterviewAnswerRequest {
  answer: string;
}

export type SaveInterviewAnswersResponse = ApiResponse<InterviewAnswer[]>;

// --- Tech Stack ---

export interface SetTechStackRequest {
  components: Record<string, string>;
  mode: 'manual' | 'ai-recommended';
}

export type SaveTechStackResponse = ApiResponse<TechStack>;

// --- Graph ---

export interface GraphNodePayload {
  label: string;
  type: string;
  x: number;
  y: number;
}

export interface GraphEdgePayload {
  sourceId: string;
  targetId: string;
}

export type SaveGraphResponse = ApiResponse<{ nodes: GraphNode[]; edges: GraphEdge[] }>;

// --- Generation ---

export interface TriggerGenerationRequest {
  stage: string;
}

export type GenerateResponse = ApiResponse<{ runId: string }>;
export type GetGenerationStatusResponse = ApiResponse<GenerationRun>;

// --- Documents ---

export type GetDocumentsResponse = ApiResponse<Document[]>;

// --- Tasks ---

export type GetTasksResponse = ApiResponse<Task[]>;

// --- Exports ---

export interface CreateExportRequest {
  includeSections: ('prd' | 'specification' | 'architecture' | 'tasks')[];
}

export type CreateExportResponse = ApiResponse<ExportRecord>;
export type ListExportsResponse = ApiResponse<ExportRecord[]>;
