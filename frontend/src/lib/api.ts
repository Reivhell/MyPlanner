import type { ApiResponse } from '@planner/shared';

const BASE_URL: string =
  (typeof process !== 'undefined' &&
    (process as { env?: Record<string, string> }).env?.PUBLIC_API_URL) ||
  'http://localhost:3001';

async function request<T>(
  path: string,
  opts?: RequestInit
): Promise<{ data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  const body: ApiResponse<T> = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return { data: body.data };
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
