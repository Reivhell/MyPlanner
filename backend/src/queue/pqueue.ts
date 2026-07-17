import PQueue from 'p-queue';
import { settingsService } from '../services/settings.js';
import { callOmniRoute as rawOmniRoute, type OmniRouteRequest, type OmniRouteResponse } from '../lib/omniroute.js';

/**
 * Bounds concurrent AI generation calls so the app never silently drops work
 * or floods OmniRoute. Default concurrency is 2 per spec §6.1; the Settings
 * value (AI_CONCURRENCY) overrides it once loaded.
 */
export const aiQueue = new PQueue({ concurrency: 2 });

/** Reload concurrency from settings (call after settings change). */
export async function refreshQueueConcurrency(): Promise<void> {
  const { aiConcurrency } = await settingsService.getAll();
  aiQueue.concurrency = Math.max(1, aiConcurrency || 2);
}

void refreshQueueConcurrency();

/** Priority alias — high runs before low (FIFO within a priority). */
const PRIORITY: Record<'high' | 'low', number> = { high: 1, low: 10 };

/**
 * Enqueue an OmniRoute-backed AI call. Every LLM request MUST go through
 * here so it is rate-limited by the queue. `fn` receives the queue-guarded
 * OmniRoute caller and should use it instead of importing `callOmniRoute`
 * directly.
 */
export function enqueueAiCall<T>(
  fn: (call: (body: OmniRouteRequest) => Promise<OmniRouteResponse>) => Promise<T>,
  opts?: { priority?: 'high' | 'low' }
): Promise<T> {
  return aiQueue.add(
    () => fn(callOmniRouteGuarded),
    { priority: PRIORITY[opts?.priority ?? 'low'] }
  ) as Promise<T>;
}

/**
 * The only OmniRoute entry point inside the queue. Calling `callOmniRoute`
 * from anywhere else is a bypass of the concurrency bound; this wrapper keeps
 * that single choke point. (We keep the public name so existing imports in
 * lib/ai-generate still resolve.)
 */
export async function callOmniRouteGuarded(body: OmniRouteRequest): Promise<OmniRouteResponse> {
  return rawOmniRoute(body);
}
