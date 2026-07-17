import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  idea: text('idea').notNull(),
  status: text('status', { enum: ['idea', 'interview', 'stack', 'planning', 'specification', 'tasks', 'completed'] }).notNull().default('idea'),
  currentStepData: text('current_step_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const interviewAnswers = sqliteTable('interview_answers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  order: integer('order').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const techStacks = sqliteTable('tech_stacks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  components: text('components', { mode: 'json' }).notNull().$type<Record<string, string>>(),
  mode: text('mode', { enum: ['manual', 'ai-recommended'] }).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const graphNodes = sqliteTable('graph_nodes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  type: text('type').notNull().default('feature'),
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
});

export const graphEdges = sqliteTable('graph_edges', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => graphNodes.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => graphNodes.id, { onDelete: 'cascade' }),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stage: text('stage', { enum: ['prd', 'specification', 'architecture'] }).notNull(),
  content: text('content', { mode: 'json' }).notNull().$type<Record<string, string>>(),
  isOutOfSync: integer('is_out_of_sync', { mode: 'boolean' }).notNull().default(false),
  generationRunId: text('generation_run_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['pending', 'in-progress', 'completed'] }).notNull().default('pending'),
  priority: integer('priority').notNull().default(1),
  order: integer('order').notNull().default(0),
  group: text('group').notNull().default(''),
  generationRunId: text('generation_run_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const generationRuns = sqliteTable('generation_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stage: text('stage', { enum: ['interview', 'interview-review', 'tech-stack-analysis', 'planning', 'prd', 'specification', 'tasks', 'export'] }).notNull(),
  state: text('state', { enum: ['idle', 'generating', 'draft', 'completed', 'failed', 'canceled'] }).notNull().default('idle'),
  error: text('error'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const exports_ = sqliteTable('exports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
