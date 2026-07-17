import { db } from '../db/index.js';
import { techStacks } from '@planner/shared';
import { eq } from 'drizzle-orm';
import type { TechStack } from '@planner/shared';
import { detectGaps, recommendStacks, STACK_CATEGORY_KEYS } from '../domain/tech-stack.js';
import { callOmniRoute } from '../lib/omniroute.js';
import { projectService } from './project.js';

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const MOCK_FILL: Record<string, string> = {
  frontend: 'SvelteKit',
  backend: 'Hono',
  database: 'SQLite',
  orm: 'Drizzle',
  styling: 'Tailwind CSS',
  auth: 'None (local-only)',
  state: 'Svelte stores',
  testing: 'Vitest',
  ai: 'OmniRoute',
  deploy: 'Self-hosted',
};

export const techStackService = {
  get(projectId: string): TechStack | undefined {
    const row = db.select().from(techStacks).where(eq(techStacks.projectId, projectId)).get();
    return row ? materialize(row) : undefined;
  },

  /** Upsert the stack for a project and recompute gaps. */
  set(
    projectId: string,
    components: Record<string, string>,
    mode: 'manual' | 'ai-recommended'
  ): TechStack {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(components)) {
      if (STACK_CATEGORY_KEYS.includes(k) && typeof v === 'string' && v.trim()) {
        clean[k] = v.trim();
      }
    }
    const existing = this.get(projectId);
    const updated = existing
      ? db.update(techStacks).set({ components: clean, mode }).where(eq(techStacks.id, existing.id)).returning().get()
      : db.insert(techStacks).values({ projectId, components: clean, mode }).returning().get();
    return materialize(updated);
  },

  detectGaps(components: Record<string, string>): string[] {
    return detectGaps(components);
  },

  /** Returns stored recommendations (persisted in project.currentStepData). */
  getRecommendations(projectId: string): Record<string, string>[] {
    const data = projectService.getProject(projectId).currentStepData;
    const recs = data?.techStackRecommendations;
    return Array.isArray(recs) ? (materialize(recs) as Record<string, string>[]) : [];
  },

  /**
   * Produce AI recommendations via OmniRoute and persist them.
   * Skeleton: OmniRoute is the only permitted LLM gateway (PRD/architecture).
   * ponytail: currently returns deterministic fallback when no key; wire the
   * chat/completions response→per-category map when the model is available.
   */
  async recommend(projectId: string, idea: string): Promise<Record<string, string>[]> {
    const prompt = buildPrompt(idea);
    try {
      const res = await callOmniRoute({
        model: 'claude-sonnet-4',
        temperature: 0.3,
        maxTokens: 2000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });
      const parsed = parseRecommendations(res.choices[0]?.message?.content ?? '');
      if (parsed.length) {
        persistRecommendations(projectId, parsed);
        return parsed;
      }
    } catch {
      // No key / model unavailable → fall back (offline-safe).
    }
    persistRecommendations(projectId, recommendStacks());
    return recommendStacks();
  },

  /**
   * Fill any gap categories. Skeleton: omniRoute-driven fill is the intended
   * path; with no model it falls back to the canonical mock stack.
   * ponytail: when keyed, call OmniRoute with the partial stack + gaps to
   * derive only the missing categories.
   */
  async autoComplete(projectId: string, idea: string): Promise<TechStack> {
    const current = this.get(projectId)?.components ?? {};
    const gaps = detectGaps(current);
    if (gaps.length === 0) {
      return this.get(projectId)!;
    }
    let filled: Record<string, string> = {};
    const prompt = buildAutoCompletePrompt(current, gaps, idea);
    try {
      const res = await callOmniRoute({
        model: 'claude-sonnet-4',
        temperature: 0.2,
        maxTokens: 1000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });
      filled = parseRecommendations(res.choices[0]?.message?.content ?? '')[0] ?? {};
    } catch {
      // offline fallback: canonical values for the missing categories.
    }
    const merged: Record<string, string> = { ...MOCK_FILL, ...current, ...filled };
    return this.set(projectId, merged, 'ai-recommended');
  },
};

function persistRecommendations(projectId: string, recs: Record<string, string>[]) {
  const project = projectService.getProject(projectId);
  const stepData = { ...(project.currentStepData ?? {}), techStackRecommendations: recs };
  projectService.updateProject(projectId, { currentStepData: stepData });
}

const SYSTEM_PROMPT =
  'You are a senior software architect. Given a product idea, recommend a coherent, opinionated technology stack. ' +
  `Respond ONLY with a JSON array of objects, each containing these keys: ${STACK_CATEGORY_KEYS.join(', ')}.`;

function buildPrompt(idea: string): string {
  return `Product idea: ${idea || '(none provided)'}\n\nRecommend 3 complete stacks as a JSON array.`;
}

function buildAutoCompletePrompt(current: Record<string, string>, gaps: string[], idea: string): string {
  return `Product idea: ${idea || '(none provided)'}. Current stack: ${JSON.stringify(current)}. ` +
    `Fill only these missing categories: ${gaps.join(', ')}. Respond with a single JSON object.`;
}

function parseRecommendations(text: string): Record<string, string>[] {
  try {
    const json = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
    const data = JSON.parse(json);
    const arr = Array.isArray(data) ? data : [data];
    return arr
      .filter((o): o is Record<string, string> => o && typeof o === 'object')
      .map((o) => {
        const out: Record<string, string> = {};
        for (const k of STACK_CATEGORY_KEYS) {
          if (o[k] && typeof o[k] === 'string') out[k] = o[k];
        }
        return out;
      })
      .filter((o) => Object.keys(o).length > 0);
  } catch {
    return [];
  }
}
