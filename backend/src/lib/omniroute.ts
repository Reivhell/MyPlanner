import { settingsService } from '../services/settings.js';

export interface OmniRouteMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OmniRouteRequest {
  model?: string;
  messages: OmniRouteMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface OmniRouteResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * The ONLY place that talks to an LLM provider. OmniRoute is the unified
 * gateway; no other module may call a model directly (PRD/architecture
 * constraints). Credentials come from Settings (DB) with env fallbacks.
 */
/**
 * Statuses worth retrying: transient server/rate-limit errors and anything
 * network-shaped (fetch throws). 4xx client errors are not retried.
 */
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
// Exponential backoff: 1s, 4s, 15s (capped).
const BACKOFF_MS = [1000, 4000, 15000];
const REQUEST_TIMEOUT_MS = 120_000;

export async function callOmniRoute(body: OmniRouteRequest): Promise<OmniRouteResponse> {
  const settings = await settingsService.getAll();
  const apiKey = settings.omnirouteApiKey;
  if (!apiKey) {
    throw new Error(
      'OmniRoute API key is not configured. Set it in Settings or use AI Mode = mock.'
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      console.log(`[omniRoute] POST ${settings.omnirouteUrl}/chat/completions (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      res = await fetch(`${settings.omnirouteUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4',
          temperature: body.temperature ?? 0.3,
          max_tokens: body.maxTokens ?? 4000,
          messages: body.messages,
        }),
      });
    } catch (err) {
      // Network-level failure or timeout: retryable.
      lastError = err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt] ?? 15000));
      }
      continue;
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      return (await res.json()) as OmniRouteResponse;
    }

    const errText = await res.text().catch(() => '');
    const message = `OmniRoute error ${res.status}: ${errText.slice(0, 500)}`;

    // Non-retryable client errors are surfaced immediately.
    if (!RETRYABLE_STATUS.has(res.status)) {
      throw new Error(message);
    }

    lastError = new Error(message);
    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt] ?? 15000));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('OmniRoute request failed after retries');
}

/** Extract the first fenced or bare JSON object/array from an LLM string. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}
