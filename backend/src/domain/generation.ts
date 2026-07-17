import type { GenerationState } from '@planner/shared';

const VALID_GEN_TRANSITIONS: Record<GenerationState, GenerationState[]> = {
  idle: ['generating', 'failed'],
  generating: ['draft', 'completed', 'failed', 'canceled'],
  draft: ['completed', 'failed'],
  completed: [],
  failed: ['idle'],
  canceled: [],
};

export function canTransitionGen(
  from: GenerationState,
  to: GenerationState
): boolean {
  return VALID_GEN_TRANSITIONS[from]?.includes(to) ?? false;
}
