import { afterEach, describe, expect, it, vi } from 'vitest';
import { providerStatuses, recordProviderResult } from '../server/adapters/status.js';
afterEach(() => vi.unstubAllEnvs());
describe('provider readiness', () => {
  it('reports implemented X1 without claiming a private case is connected', () => {
    expect(providerStatuses().find(p => p.provider === 'x1')?.status).toBe('not_configured');
    const ready = providerStatuses({individual:true,oauth:true}).find(p => p.provider === 'x1');
    expect(ready?.status).toBe('available');
    expect(ready?.detail).toContain('private to each investor case');
    recordProviderResult('x1', true, 'A different investor connected');
    expect(providerStatuses().find(p => p.provider === 'x1')?.status).toBe('not_configured');
  });
  it('does not confuse a configured dedicated key with verified provider access', () => {
    expect(providerStatuses({dedicated:true}).find(p => p.provider === 'x1')?.status).toBe('available');
  });
  it('requires all four Roundtable settings and a real result before verification', () => {
    for(const name of ['ROUNDTABLE_APP_KEY','ROUNDTABLE_WORKER_KEY','ROUNDTABLE_WORKER_ID','ROUNDTABLE_PROJECT']) vi.stubEnv(name,'test');
    expect(providerStatuses().find(p => p.provider === 'roundtable')?.status).toBe('not_verified');
    for(const name of ['ROUNDTABLE_WORKER_ID','ROUNDTABLE_PROJECT']) {
      vi.stubEnv(name,'');
      expect(providerStatuses().find(p => p.provider === 'roundtable')?.status).toBe('not_configured');
      vi.stubEnv(name,'test');
    }
  });
});
