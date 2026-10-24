import type { Provider, ProviderStatus } from '../../shared/contracts.js';

const results = new Map<Provider, ProviderStatus>();
export function recordProviderResult(provider: Provider, ok: boolean, detail: string) {
  results.set(provider, { provider, status: ok ? 'verified' : 'failed', detail });
}

// Replace per adapter only after a real request succeeds; env presence is not proof.
export function providerStatuses(): ProviderStatus[] {
  return (['x1', 'nicrron', 'akta', 'roundtable', 'prism'] as const).map(provider => results.get(provider) ?? (provider === 'akta' ? {
    provider, status: 'not_configured' as const, detail: process.env.AKTA_API_KEY ? 'Key configured; no live request verified in this process yet.' : 'Set AKTA_API_KEY on the server.',
  } : {
    provider, status: 'not_implemented', detail: 'Adapter contract only. No live provider request has run.',
  }));
}
