import { db } from '../db/index.js';
import {
  generationRuns,
  interviewAnswers,
  graphNodes,
  graphEdges,
  techStacks,
  documents,
  tasks,
} from '@planner/shared';
import { eq, and } from 'drizzle-orm';
import type { GenerationRun, AiStage, DocumentContent, ProjectStatus } from '@planner/shared';
import { aiQueue } from '../queue/pqueue.js';
import { projectService, advanceIfNext } from './project.js';
import { documentService } from './documents.js';
import { interviewService } from './interview.js';
import { techStackService } from './tech-stack.js';
import {
  generateDocument,
  generateTasks,
  generateInterviewQuestions,
  reviewInterviewAnswers,
  analyzeTechStack,
  generatePlanningGraph,
  PRD_SECTIONS,
  SPEC_SECTIONS,
  ARCH_SECTIONS,
  type GenContext,
  type TaskDraft,
  type InterviewReviewResult,
  type TechStackAnalysisResult,
} from '../lib/ai-generate.js';
import { callOmniRoute } from '../lib/omniroute.js';
import { n8nService } from './n8n.js';

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function buildContext(projectId: string): GenContext {
  const project = projectService.getProject(projectId);
  const interview = db
    .select()
    .from(interviewAnswers)
    .where(eq(interviewAnswers.projectId, projectId))
    .orderBy(interviewAnswers.order)
    .all();
  const nodes = db
    .select()
    .from(graphNodes)
    .where(eq(graphNodes.projectId, projectId))
    .all();
  const edges = db
    .select()
    .from(graphEdges)
    .where(eq(graphEdges.projectId, projectId))
    .all();
  const stackRow = db
    .select()
    .from(techStacks)
    .where(eq(techStacks.projectId, projectId))
    .get();
  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;

  const prd = documentService.getByStage(projectId, 'prd')?.content ?? null;
  const spec = documentService.getByStage(projectId, 'specification')?.content ?? null;

  return {
    project: {
      name: project.name,
      idea: project.idea,
      description: project.description,
    },
    interview: interview.map((a) => ({ question: a.question, answer: a.answer })),
    stack: stackRow?.components ?? null,
    nodes: nodes.map((n) => ({ label: n.label, type: n.type })),
    edges: edges.map((e) => ({ from: labelOf(e.sourceId), to: labelOf(e.targetId) })),
    prd,
    spec,
  };
}

export const aiService = {
  async createRun(projectId: string, stage: AiStage): Promise<GenerationRun> {
    return materialize(
      db
        .insert(generationRuns)
        .values({ projectId, stage, state: 'idle' })
        .returning()
        .get()
    );
  },

  async getRuns(projectId: string): Promise<GenerationRun[]> {
    return materialize(
      db
        .select()
        .from(generationRuns)
        .where(eq(generationRuns.projectId, projectId))
        .orderBy(generationRuns.createdAt)
        .all()
    );
  },

  getRun(runId: string): GenerationRun | undefined {
    const row = db.select().from(generationRuns).where(eq(generationRuns.id, runId)).get();
    return row ? materialize(row) : undefined;
  },

  async transitionRun(
    runId: string,
    state: GenerationRun['state'],
    error?: string
  ): Promise<GenerationRun> {
    const row = db
      .update(generationRuns)
      .set({ state, error, updatedAt: new Date().toISOString() })
      .where(eq(generationRuns.id, runId))
      .returning()
      .get();
    return materialize(row);
  },

  async cancelRun(runId: string): Promise<void> {
    await this.transitionRun(runId, 'canceled');
  },

  /** Dispatch a generation run; resolves immediately with the created run. */
  async dispatchGeneration(projectId: string, stage: AiStage): Promise<GenerationRun> {
    const run = await this.createRun(projectId, stage);

    // Multi-step pipeline stages (spec.md §7) use n8n orchestration
    const n8nStages: AiStage[] = ['planning', 'prd', 'specification', 'tasks'];

    if (n8nStages.includes(stage)) {
      // Check if n8n is configured
      const { n8nWebhookUrl } = await n8nService.getSettings?.() ?? { n8nWebhookUrl: undefined };
      if (n8nWebhookUrl) {
        // Dispatch to n8n workflow
        const workflowMap: Record<AiStage, string> = {
          'planning': 'planning-generator',
          'prd': 'prd-generator',
          'specification': 'specification-generator',
          'tasks': 'task-generator',
          'interview': 'interview-generator',
          'interview-review': 'interview-reviewer',
          'tech-stack-analysis': 'tech-stack-analyzer',
          'export': 'export-generator',
        };

        const workflow = workflowMap[stage];
        if (workflow) {
          await n8nService.triggerWorkflow(workflow, { projectId, runId: run.id });
          return run;
        }
      }
    }

    // Single-call stages or no n8n configured: use local queue
    void aiQueue.add(() => this.runStage(run.id, projectId, stage));
    return run;
  },

  /**
   * Generate draft content. Moves the run to `draft` (never `completed`)
   * so the user can review + accept. Only on accept does the run complete
   * and the project advance. A failed generation leaves the run `failed`
   * and does NOT advance the project status (partial-pipeline safety).
   */
  async runStage(runId: string, projectId: string, stage: AiStage): Promise<void> {
    await this.transitionRun(runId, 'generating');
    try {
      const ctx = buildContext(projectId);

      if (stage === 'interview') {
        // Interview questions generation (via OmniRoute)
        const questions = await generateInterviewQuestions(ctx);
        // Store generated questions
        for (let i = 0; i < questions.length; i++) {
          db.insert(interviewAnswers)
            .values({ projectId, question: questions[i], answer: '', order: i })
            .run();
        }
        await this.transitionRun(runId, 'draft');
      } else if (stage === 'interview-review') {
        // Interview Reviewer: validate completeness
        const review = await reviewInterviewAnswers(ctx);
        if (!review.isComplete) {
          // Store follow-up questions
          for (const fq of review.followUpQuestions) {
            db.insert(interviewAnswers)
              .values({ projectId, question: fq.question, answer: '', order: 999 })
              .run();
          }
        }
        await this.transitionRun(runId, 'draft');
      } else if (stage === 'tech-stack-analysis') {
        // Tech Stack Analyzer: analyze interview + recommend stack
        const analysis = await analyzeTechStack(ctx);
        // Store recommendations in project.currentStepData
        projectService.updateProject(projectId, {
          currentStepData: {
            ...(projectService.getProject(projectId).currentStepData ?? {}),
            techStackRecommendations: analysis.recommendations,
            techStackGaps: analysis.gaps,
          },
        });
        await this.transitionRun(runId, 'draft');
      } else if (stage === 'planning') {
        // Planning Generator: build graph from interview + stack
        const graphData = await generatePlanningGraph(ctx);
        // Store graph nodes/edges
        for (const node of graphData.nodes) {
          db.insert(graphNodes).values({ projectId, ...node }).run();
        }
        for (const edge of graphData.edges) {
          db.insert(graphEdges).values({ projectId, sourceId: edge.sourceId, targetId: edge.targetId }).run();
        }
        await this.transitionRun(runId, 'draft');
      } else if (stage === 'prd') {
        const content = await generateDocument(ctx, PRD_SECTIONS, 'prd');
        documentService.upsert(projectId, 'prd', content, runId, false);
        documentService.clearOutOfSync(projectId);
      } else if (stage === 'specification') {
        const spec = await generateDocument(ctx, SPEC_SECTIONS, 'specification');
        documentService.upsert(projectId, 'specification', spec, runId, false);
        const arch = await generateDocument(ctx, ARCH_SECTIONS, 'architecture');
        documentService.upsert(projectId, 'architecture', arch, runId, false);
        documentService.clearOutOfSync(projectId);
      } else if (stage === 'tasks') {
        const drafts: TaskDraft[] = await generateTasks(ctx);
        db.delete(tasks).where(eq(tasks.projectId, projectId)).run();
        drafts.forEach((d, i) => {
          db.insert(tasks)
            .values({
              projectId,
              title: d.title,
              description: d.description,
              priority: d.priority,
              group: d.group,
              order: i,
              generationRunId: runId,
            })
            .run();
        });
      } else {
        // interview / interview-review / tech-stack-analysis / planning / export
        // are no-ops here (handled by their own services); mark completed.
        await this.transitionRun(runId, 'completed');
        return;
      }

      await this.transitionRun(runId, 'draft');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.transitionRun(runId, 'failed', message);
    }
  },

  /**
   * User accepted the generated draft. Completes the run and advances the
   * project to the next status exactly one step (spec §11.1 state machine).
   * Only the stages that own a project transition do so.
   */
  async acceptRun(runId: string): Promise<GenerationRun> {
    const run = this.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.state !== 'draft') {
      throw new Error(`Cannot accept run in state '${run.state}'`);
    }
    const nextByStage: Partial<Record<AiStage, ProjectStatus>> = {
      'interview': 'interview',
      'interview-review': 'stack',
      'tech-stack-analysis': 'planning',
      'planning': 'specification',
      'prd': 'specification',
      'specification': 'tasks',
      'tasks': 'tasks',
    };
    const next = nextByStage[run.stage];
    if (next) advanceIfNext(run.projectId, next);
    return this.transitionRun(runId, 'completed');
  },
};
