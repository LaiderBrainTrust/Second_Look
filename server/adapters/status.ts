import type { Provider, ProviderStatus } from '../../shared/contracts.js';

const results = new Map<Provider, ProviderStatus>();
export function recordProviderResult(provider: Provider, ok: boolean, detail: string) {
  results.set(provider, { provider, status: ok ? 'verified' : 'failed', detail });
}

// Replace per adapter only after a real request succeeds; env presence is not proof.
export function providerStatuses(x1: { individual?: boolean; oauth?: boolean; dedicated?: boolean } = {}): ProviderStatus[] {
  return (['x1', 'nicrron', 'akta', 'roundtable', 'prism'] as const).map(provider => (provider === 'x1' ? {
    provider, status: x1.individual || x1.dedicated ? 'available' as const : 'not_configured' as const,
    detail: x1.oauth ? 'Connect X1 is available. Connection and verification are private to each investor case; this badge does not mean your case is connected.' : x1.individual ? 'Read-only X1 key connections are available for individual investor cases. Check the selected case for its connection status.' : x1.dedicated ? 'The synthetic example has a dedicated X1 key configured; verify it by searching for a source in that case.' : 'X1 integration is implemented. Enable individual connections with X1_CONNECTION_ENCRYPTION_KEY or configure X1_API_KEY and X1_CASE_ID for the synthetic example.',
  } : results.get(provider) ?? (provider === 'akta' ? {
    provider, status: process.env.AKTA_API_KEY ? 'not_verified' as const : 'not_configured' as const, detail: process.env.AKTA_API_KEY ? 'Key configured; no live request verified in this process yet.' : 'Set AKTA_API_KEY on the server.',
  } : provider === 'nicrron' ? {
    provider, status: process.env.NICRRON_API_KEY ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Model review runs inside the Roundtable worker; requires NICRRON_API_KEY.',
  } : provider === 'roundtable' ? {
    provider, status: process.env.ROUNDTABLE_APP_KEY && process.env.ROUNDTABLE_WORKER_KEY && process.env.ROUNDTABLE_WORKER_ID && process.env.ROUNDTABLE_PROJECT ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Requires ROUNDTABLE_APP_KEY, ROUNDTABLE_WORKER_KEY, ROUNDTABLE_WORKER_ID and ROUNDTABLE_PROJECT on this server. Configuration is not a successful review.',
  } : provider === 'prism' ? {
    provider, status: (process.env.PRISM_TRACE_KEY || process.env.PRISMTRACE_API_KEY) && (process.env.PRISM_PROJECT_ID || process.env.PRISMTRACE_PROJECT_ID) ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Records the actual Nicrron review in PRISM when the trace key and project ID are configured.',
  } : {
    provider, status: 'not_implemented', detail: 'Adapter contract only. No live provider request has run.',
  })));
}
