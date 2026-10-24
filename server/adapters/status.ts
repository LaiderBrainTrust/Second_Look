import type { Provider, ProviderStatus } from '../../shared/contracts.js';

const results = new Map<Provider, ProviderStatus>();
export function recordProviderResult(provider: Provider, ok: boolean, detail: string) {
  results.set(provider, { provider, status: ok ? 'verified' : 'failed', detail });
}

// Replace per adapter only after a real request succeeds; env presence is not proof.
export function providerStatuses(): ProviderStatus[] {
  return (['x1', 'nicrron', 'akta', 'roundtable', 'prism'] as const).map(provider => results.get(provider) ?? (provider === 'akta' ? {
    provider, status: process.env.AKTA_API_KEY ? 'not_verified' as const : 'not_configured' as const, detail: process.env.AKTA_API_KEY ? 'Key configured; no live request verified in this process yet.' : 'Set AKTA_API_KEY on the server.',
  } : provider === 'roundtable' ? {
    provider, status: process.env.ROUNDTABLE_APP_KEY && process.env.ROUNDTABLE_WORKER_KEY ? 'not_verified' as const : 'not_configured' as const,
    detail: 'Live app review adapter; requires an app key, reviewer key and ID, and shared project.',
  } : {
    provider, status: 'not_implemented', detail: 'Adapter contract only. No live provider request has run.',
  }));
}
