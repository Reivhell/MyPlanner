import { extractJson } from '../lib/omniroute.js';
import { enqueueAiCall } from '../queue/pqueue.js';
import { settingsService } from '../services/settings.js';
import type { DocumentContent } from '@planner/shared';

export interface GenContext {
  project: { name: string; idea: string; description?: string | null };
  interview: { question: string; answer: string }[];
  stack: Record<string, string> | null;
  nodes: { label: string; type: string }[];
  edges: { from: string; to: string }[];
  prd?: DocumentContent | null;
  spec?: DocumentContent | null;
}

export interface TaskDraft {
  title: string;
  description: string;
  priority: number;
  group: string;
}

export interface InterviewReviewResult {
  isComplete: boolean;
  missingAreas: string[];
  followUpQuestions: { question: string; reason: string }[];
}

export interface TechStackAnalysisResult {
  recommendations: Record<string, string>[];
  gaps: string[];
}

export const PRD_SECTIONS = [
  'overview',
  'problem_statement',
  'goals',
  'target_users',
  'features',
  'requirements',
  'design_principles',
] as const;

export const SPEC_SECTIONS = [
  'architecture_overview',
  'frontend_modules',
  'backend_services',
  'database_schema',
  'api_endpoints',
  'data_flow',
] as const;

export const ARCH_SECTIONS = [
  'overview',
  'system_components',
  'data_flow',
  'tech_constraints',
] as const;

function answerFor(ctx: GenContext, ...keywords: string[]): string {
  const hit = ctx.interview.find((a) =>
    keywords.some((k) => a.question.toLowerCase().includes(k.toLowerCase()))
  );
  return hit?.answer?.trim() || '';
}

function featureNodes(ctx: GenContext) {
  return ctx.nodes.filter((n) => n.type === 'feature' || n.type === 'module');
}

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join('\n') : '- (none specified)';
}

function mdSection(heading: string, body: string): string {
  return `## ${heading}\n\n${body.trim() || '_Not specified._'}\n`;
}

// ---------------------------------------------------------------------------
// Mock generators (used when aiMode === 'mock')
// ---------------------------------------------------------------------------

function mockPrd(ctx: GenContext): DocumentContent {
  return {
    overview: `# ${ctx.project.name}\n\n${ctx.project.idea}`,
    problem_statement: answerFor(ctx, 'problem', 'pain', 'solve'),
    goals: list(ctx.interview.filter((a) => /goal|objective|success/i.test(a.question)).map((a) => a.answer)),
    target_users: answerFor(ctx, 'user', 'audience', 'customer', 'target'),
    features: list(
      featureNodes(ctx).map((n) => n.label)
    ),
    requirements: list(
      ctx.interview
        .filter((a) => /require|constraint|must|need/i.test(a.question))
        .map((a) => a.answer)
    ),
    design_principles: list(
      ctx.interview
        .filter((a) => /principle|design|philosophy|approach/i.test(a.question))
        .map((a) => a.answer)
    ),
  };
}

function mockSpec(ctx: GenContext): DocumentContent {
  return {
    architecture_overview: 'Modular monolith with clean separation of concerns.',
    frontend_modules: list(
      featureNodes(ctx)
        .filter((n) => /ui|frontend|component|view/i.test(n.label))
        .map((n) => n.label)
    ),
    backend_services: list(
      featureNodes(ctx)
        .filter((n) => /api|service|backend|server/i.test(n.label))
        .map((n) => n.label)
    ),
    database_schema: list(
      ctx.nodes
        .filter((n) => n.type === 'data')
        .map((n) => n.label)
    ),
    api_endpoints: list(
      featureNodes(ctx)
        .filter((n) => /api|endpoint|route/i.test(n.label))
        .map((n) => n.label)
    ),
    data_flow: list(
      ctx.edges.map((e) => `${e.from} → ${e.to}`)
    ),
  };
}

function mockArch(ctx: GenContext): DocumentContent {
  return {
    overview: 'System architecture for a local-first planning tool.',
    system_components: list(
      ctx.nodes.map((n) => `${n.label} (${n.type})`)
    ),
    data_flow: list(
      ctx.edges.map((e) => `${e.from} → ${e.to}`)
    ),
    tech_constraints: list(
      Object.entries(ctx.stack || {}).map(([k, v]) => `${k}: ${v}`)
    ),
  };
}

function mockTasks(ctx: GenContext): TaskDraft[] {
  const groups = featureNodes(ctx).length
    ? featureNodes(ctx)
    : [{ label: 'Foundation', type: 'module' }, { label: 'Core', type: 'module' }];
  const tasks: TaskDraft[] = [];
  let order = 0;
  for (const g of groups) {
    for (const step of ['Scaffold', 'Implement', 'Write tests for']) {
      tasks.push({
        title: `${step} ${g.label}`,
        description: `${step} the ${g.label} area of the product.`,
        priority: 2,
        group: g.label,
      });
      order++;
    }
  }
  return tasks;
}

function mockInterviewQuestions(ctx: GenContext): string[] {
  return [
    'What is the biggest problem this product solves?',
    'Who is the target user?',
    'What are the core features?',
    'What platforms will this run on?',
    'What is your timeline?',
    'What existing solutions or competitors exist?',
    'How will this make money (if at all)?',
    'What are the key technical constraints?',
  ];
}

function mockInterviewReview(ctx: GenContext): InterviewReviewResult {
  const unanswered = ctx.interview.filter((a) => !a.answer || a.answer.trim().length < 3);
  return {
    isComplete: unanswered.length === 0,
    missingAreas: unanswered.map((a) => a.question),
    followUpQuestions: unanswered.slice(0, 3).map((a) => ({
      question: `Could you elaborate on: ${a.question}?`,
      reason: 'Answer was too brief or missing',
    })),
  };
}

function mockTechStackAnalysis(ctx: GenContext): TechStackAnalysisResult {
  return {
    recommendations: [
      { frontend: 'SvelteKit', backend: 'Hono', database: 'SQLite', orm: 'Drizzle', auth: 'None (local-only)', state: 'Svelte stores', testing: 'Vitest', deploy: 'Self-hosted', ai: 'OmniRoute', styling: 'Tailwind CSS' },
      { frontend: 'Next.js', backend: 'Fastify', database: 'PostgreSQL', orm: 'Prisma', auth: 'NextAuth', state: 'Zustand', testing: 'Jest', deploy: 'Vercel', ai: 'OpenAI', styling: 'Tailwind CSS' },
      { frontend: 'Remix', backend: 'Express', database: 'MySQL', orm: 'TypeORM', auth: 'Clerk', state: 'Redux Toolkit', testing: 'Playwright', deploy: 'AWS', ai: 'Anthropic', styling: 'CSS Modules' },
    ],
    gaps: [],
  };
}

function mockPlanningGraph(ctx: GenContext): { nodes: { label: string; type: string; x: number; y: number }[]; edges: { sourceId: string; targetId: string }[] } {
  return {
    nodes: [
      { label: 'Core Features', type: 'feature', x: 0, y: 0 },
      { label: 'User Auth', type: 'component', x: 0, y: 0 },
      { label: 'Data Models', type: 'data', x: 0, y: 0 },
    ],
    edges: [
      { sourceId: '0', targetId: '1' },
      { sourceId: '0', targetId: '2' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Real generators (OmniRoute)
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'prompts');

function readPromptTemplate(name: string): string {
  return readFileSync(join(PROMPTS_DIR, name), 'utf8');
}

function dumpContext(ctx: GenContext): string {
  return [
    `Project: ${ctx.project.name}`,
    `Idea: ${ctx.project.idea}`,
    ctx.project.description ? `Description: ${ctx.project.description}` : '',
    '',
    'Interview Answers:',
    ...ctx.interview.map((a) => `- Q: ${a.question}\n  A: ${a.answer || '(unanswered)'}`),
    '',
    'Planning Graph Nodes:',
    ...ctx.nodes.map((n) => `- ${n.label} (${n.type})`),
    '',
    'Planning Graph Edges:',
    ...ctx.edges.map((e) => `- ${e.from} → ${e.to}`),
    '',
    ctx.stack ? `Tech Stack: ${JSON.stringify(ctx.stack, null, 2)}` : 'Tech Stack: (not set)',
    ctx.prd ? `\nExisting PRD:\n${JSON.stringify(ctx.prd, null, 2)}` : '',
    ctx.spec ? `\nExisting Specification:\n${JSON.stringify(ctx.spec, null, 2)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateDocument(
  ctx: GenContext,
  sections: readonly string[],
  stage: string
): Promise<DocumentContent> {
  const { aiMode } = await settingsService.getAll();
  if (aiMode === 'mock') {
    switch (stage) {
      case 'prd':
        return mockPrd(ctx);
      case 'specification':
        return mockSpec(ctx);
      case 'architecture':
        return mockArch(ctx);
    }
  }

  const template = readPromptTemplate(`${stage}.md`);
  const prompt = template.replace('{{CONTEXT}}', dumpContext(ctx)).replace('{{SECTIONS}}', sections.join(', '));

  const res = await enqueueAiCall((call) =>
    call({
      messages: [
        { role: 'system', content: 'You output valid JSON only. No commentary.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    })
  );

  const raw = res.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(extractJson(raw));
    const result: DocumentContent = {};
    for (const s of sections) {
      result[s] = parsed[s] || parsed[s.replace(/_/g, ' ')] || '';
    }
    return result;
  } catch {
    return stage === 'prd' ? mockPrd(ctx) : stage === 'specification' ? mockSpec(ctx) : mockArch(ctx);
  }
}

export async function generateInterviewQuestions(ctx: GenContext): Promise<string[]> {
  const { aiMode } = await settingsService.getAll();
  if (aiMode === 'mock') return mockInterviewQuestions(ctx);

  const res = await enqueueAiCall((call) =>
    call({
      messages: [
        { role: 'system', content: 'You output valid JSON only. No commentary.' },
        {
          role: 'user',
          content: [
            'Generate 8-10 targeted interview questions for a product planning session.',
            'Questions should be specific to the product idea and cover: problem, users, features, platform, timeline, competitors, monetization, technical constraints.',
            'Return a JSON array of strings only.',
            '',
            `Product idea: ${ctx.project.idea}`,
            `Description: ${ctx.project.description ?? '(none)'}`,
          ].join('\n'),
        },
      ],
      temperature: 0.4,
    })
  );
  const raw = res.choices[0]?.message?.content ?? '[]';
  try {
    const parsed = JSON.parse(extractJson(raw));
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return mockInterviewQuestions(ctx);
  }
}

export async function reviewInterviewAnswers(ctx: GenContext): Promise<InterviewReviewResult> {
  const { aiMode } = await settingsService.getAll();
  if (aiMode === 'mock') return mockInterviewReview(ctx);

  const res = await enqueueAiCall((call) =>
    call({
      messages: [
        { role: 'system', content: 'You output valid JSON only. No commentary.' },
        {
          role: 'user',
          content: [
            'Review the interview answers for completeness and specificity.',
            'Identify areas that are too vague or missing entirely.',
            'Return JSON: { "isComplete": boolean, "missingAreas": string[], "followUpQuestions": [{ "question": string, "reason": string }] }',
            'Max 3 follow-up questions.',
            '',
            'Interview Q&A:',
            ctx.interview.map((a) => `Q: ${a.question}\nA: ${a.answer || '(unanswered)'}`).join('\n\n'),
          ].join('\n'),
        },
      ],
      temperature: 0.3,
    })
  );
  const raw = res.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(extractJson(raw));
    return {
      isComplete: parsed.isComplete ?? false,
      missingAreas: parsed.missingAreas ?? [],
      followUpQuestions: parsed.followUpQuestions ?? [],
    };
  } catch {
    return mockInterviewReview(ctx);
  }
}

export async function analyzeTechStack(ctx: GenContext): Promise<TechStackAnalysisResult> {
  const { aiMode } = await settingsService.getAll();
  if (aiMode === 'mock') return mockTechStackAnalysis(ctx);

  const res = await enqueueAiCall((call) =>
    call({
      messages: [
        { role: 'system', content: 'You output valid JSON only. No commentary.' },
        {
          role: 'user',
          content: [
            'Analyze the product requirements and recommend 3 complete technology stacks.',
            'Categories: frontend, backend, database, orm, auth, state, testing, deploy, ai, styling',
            'Return JSON: { "recommendations": [{ category: choice, ... }], "gaps": string[] }',
            '',
            `Product: ${ctx.project.name}`,
            `Idea: ${ctx.project.idea}`,
            `Interview:\n${ctx.interview.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`,
          ].join('\n'),
        },
      ],
      temperature: 0.3,
    })
  );
  const raw = res.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(extractJson(raw));
    return {
      recommendations: parsed.recommendations ?? [],
      gaps: parsed.gaps ?? [],
    };
  } catch {
    return mockTechStackAnalysis(ctx);
  }
}

export async function generatePlanningGraph(ctx: GenContext): Promise<{ nodes: { label: string; type: string; x: number; y: number }[]; edges: { sourceId: string; targetId: string }[] }> {
  const { aiMode } = await settingsService.getAll();
  if (aiMode === 'mock') return mockPlanningGraph(ctx);

  const res = await enqueueAiCall((call) =>
    call({
      messages: [
        { role: 'system', content: 'You output valid JSON only. No commentary.' },
        {
          role: 'user',
          content: [
            'Generate a Planning Graph as nodes and edges for a product.',
            'Node types: feature, component, data, actor, decision',
            'Return JSON: { "nodes": [{ "label": string, "type": string, "x": number, "y": number }], "edges": [{ "sourceId": string, "targetId": string }] }',
            'Use placeholder IDs for nodes (will be replaced). x/y can be 0 for auto-layout.',
            '',
            `PRD: ${JSON.stringify(ctx.prd)}`,
            `Spec: ${JSON.stringify(ctx.spec)}`,
            `Tech Stack: ${JSON.stringify(ctx.stack)}`,
          ].join('\n'),
        },
      ],
      temperature: 0.3,
    })
  );
  const raw = res.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(extractJson(raw));
    return {
      nodes: parsed.nodes ?? [],
      edges: parsed.edges ?? [],
    };
  } catch {
    return mockPlanningGraph(ctx);
  }
}

export async function generateTasks(ctx: GenContext): Promise<TaskDraft[]> {
  const { aiMode } = await settingsService.getAll();
  if (aiMode === 'mock') return mockTasks(ctx);

  const res = await enqueueAiCall((call) =>
    call({
      messages: [
        { role: 'system', content: 'You output valid JSON only. No commentary.' },
        {
          role: 'user',
          content: [
            'Generate a structured task breakdown as a JSON array.',
            'Each item: { "title": string, "description": string, "priority": number 1-5, "group": string }.',
            'Group tasks by feature/module. Each task should be implementable in one session.',
            '',
            `PRD:\n${JSON.stringify(ctx.prd, null, 2)}`,
            `Specification:\n${JSON.stringify(ctx.spec, null, 2)}`,
            `Graph nodes:\n${ctx.nodes.map((n) => `- ${n.label} (${n.type})`).join('\n')}`,
          ].join('\n'),
        },
      ],
      temperature: 0.3,
    })
  );
  const raw = res.choices[0]?.message?.content ?? '[]';
  try {
    const parsed = JSON.parse(extractJson(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return mockTasks(ctx);
  }
}