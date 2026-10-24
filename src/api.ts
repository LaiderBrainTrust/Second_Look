import type { Role } from '../shared/contracts';

// Relative URLs only: Vite proxies /api in development and the hosted app is same-origin.
// The x-demo-role header is local impersonation; hosted mode ignores it and uses the server session.
export async function api<T = any>(path: string, body?: unknown, role: Role = 'lp', signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-role': role },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  let value: any = null;
  try { value = await response.json(); } catch { /* the body was not JSON */ }
  if (response.status === 401 && path !== '/api/session/login') window.dispatchEvent(new Event('second-look-session-expired'));
  if (!response.ok) throw new Error(value?.error ?? 'The request could not be completed.');
  return value as T;
}
