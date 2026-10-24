import type { Provider, ProviderStatus } from '../../shared/contracts.js';

const results = new Map<Provider, ProviderStatus>();
export function recordProviderResult(provider: Provider, ok: boolean, detail: string) {
  results.set(provider, { provider, status: ok ? 'verified' : 'failed', detail });
}

// Replace per adapter only after a real request succeeds; env presence is not proof.
export function providerStatuses(): ProviderStatus[] {
  return (['x1', 'nicrron', 'akta', 'roundtable', 'prism'] as const).map(provider => results.get(provider) ?? (provider === 'akta' ? {
    provider, status: process.env.AKTA_API_KEY ? 'not_verified' as const : 'not_configured' as const, detail: process.env.AKTA_API_KEY ? 'Key configured; no live request verified in this process yet.' : 'Set AKTA_API_KEY on the server.',
  } : provider === 'nicrron' ? {
    provider, status: process.env.NICRRON_API_KEY ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Model review runs inside the Roundtable worker; requires NICRRON_API_KEY.',
  } : provider === 'roundtable' ? {
    provider, status: process.env.ROUNDTABLE_APP_KEY && process.env.ROUNDTABLE_WORKER_KEY ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Live app review adapter; requires an app key, reviewer key and ID, and shared project.',
  } : provider === 'prism' ? {
    provider, status: (process.env.PRISM_TRACE_KEY || process.env.PRISMTRACE_API_KEY) && (process.env.PRISM_PROJECT_ID || process.env.PRISMTRACE_PROJECT_ID) ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Records the actual Nicrron review in PRISM when the trace key and project ID are configured.',
  } : {
    provider, status: 'not_implemented', detail: 'Adapter contract only. No live provider request has run.',
  }));
}
