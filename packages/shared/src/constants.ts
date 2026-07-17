/** Project status values mirroring the 8-step workflow (spec.md §11.1) */
export const PROJECT_STATUSES = [
  'idea',
  'interview',
  'stack',
  'planning',
  'specification',
  'tasks',
  'completed',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Generation run states (spec.md §11.2) */
export const GENERATION_STATES = [
  'idle',
  'generating',
  'draft',
  'completed',
  'failed',
  'canceled',
] as const;
export type GenerationState = (typeof GENERATION_STATES)[number];

/** Stages in the AI pipeline (spec.md §7) */
export const AI_STAGES = [
  'interview',
  'interview-review',
  'tech-stack-analysis',
  'planning',
  'prd',
  'specification',
  'tasks',
  'export',
] as const;
export type AiStage = (typeof AI_STAGES)[number];

/** The 8 workflow steps as a tuple (PRD §4) */
export const WORKFLOW_STEPS = [
  'Create Project',
  'Interview',
  'Tech Stack',
  'Planning Graph',
  'Generate PRD',
  'Generate Specification',
  'Generate Tasks',
  'Export AI Workspace',
] as const;

/** Step display labels for the stepper */
export const STEP_LABELS = ['Interview', 'Tech Stack', 'Planning', 'Specification', 'Tasks'];
