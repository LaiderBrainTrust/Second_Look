import type { ProviderStatus } from '../../shared/contracts.js';

// Replace per adapter only after a real request succeeds; env presence is not proof.
export function providerStatuses(): ProviderStatus[] {
  return (['x1', 'nicrron', 'akta', 'roundtable', 'prism'] as const).map(provider => ({
    provider, status: 'not_implemented', detail: 'Adapter contract only. No live provider request has run.',
  }));
}
