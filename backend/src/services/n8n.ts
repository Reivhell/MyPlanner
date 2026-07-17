import { settingsService } from './settings.js';

/**
 * Optional multi-step pipeline orchestration via n8n (spec.md §7).
 * Single-call stages run directly through the backend; this hook is used
 * only when a project opts into an n8n webhook. It never calls a model
 * directly — the n8n workflow itself routes through OmniRoute.
 */
export const n8nService = {
  async getSettings(): Promise<{ n8nWebhookUrl: string | undefined }> {
    const settings = await settingsService.getAll();
    return { n8nWebhookUrl: settings.n8nWebhookUrl };
  },

  async triggerWorkflow(workflow: string, payload: unknown): Promise<{ dispatched: boolean }> {
    const { n8nWebhookUrl } = await this.getSettings();
    if (!n8nWebhookUrl) return { dispatched: false };
    await fetch(`${n8nWebhookUrl.replace(/\/$/, '')}/${workflow}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
    return { dispatched: true };
  },
};
