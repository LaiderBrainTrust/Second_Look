import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResearchInput, ResearchRun } from '../shared/research.js';
import { reviewInput } from '../server/adapters/roundtable.js';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';

const input: ResearchInput = {
  caseId: 'sample-fund', caseRevision: 1, runId: 'run-one', after: '2026-09-30',
  offer: { version: 1, purchasePriceCents: 70_000_000, distributionRecipient: 'seller' },
  finding: { companyId: 'company-1', companyName: 'Sample', claim: 'Company announces financing', publishedAt: '2026-10-22T10:00:00', retrievedAt: '2026-10-24T10:00:00Z', source: { id: 'akta:1', label: 'Source article', kind: 'external', url: 'https://news.test/financing' } },
};
function run(): ResearchRun {
  return { id: 'run-one', caseId: 'sample-fund', caseRevision: 1, company: { uuid: 'company-1', name: 'Sample', website: 'sample.test' }, after: input.after,
    status: 'done', createdAt: '2026-10-24T10:00:00Z', findings: [input.finding], selectedFindingId: 'akta:1',
    result: { ...reviewInput(input), sources: [] }, writeRequestId: 'write-one', dispatchRequestId: 'dispatch-one' };
}
describe('research-to-case handoff', () => {
  it('proposes a source-bound question without inventing a value or approval', () => {
    const result = reviewInput(input);
    expect(result.question).toContain('Does this change');
    expect(result.caseRevision).toBe(1);
    expect(result.method).toBe('rule-based');
    expect(() => reviewInput({ ...input, after: '2026-10-23' })).toThrow();
    expect(() => reviewInput({ ...input, finding: { ...input.finding, source: { ...input.finding.source, url: 'javascript:alert(1)' } } })).toThrow();
  });
  it('shares only a current completed result and makes the prior answer and approval historical', () => {
    const store = createStore(':memory:');
    try {
      store.command('gp', 1, { kind: 'answer', text: 'Existing answer', distributionCents: 100 });
      store.command('lp', 2, { kind: 'approve' });
      store.saveResearch(run());
      expect(() => store.publishResearch('run-one', 2)).toThrow('current case');
      const updated = { ...run(), caseRevision: 2, result: { ...run().result!, caseRevision: 2 } };
      store.saveResearch(updated);
      const shared = store.publishResearch('run-one', 2);
      expect(shared.revision).toBe(3); expect(shared.answer).toBeNull();
      expect(shared.reviews).toHaveLength(1); expect(shared.reviews[0].revision).toBe(2);
      expect(shared.questionSource?.id).toBe('akta:1');
      expect(store.publishResearch('run-one', 2).revision).toBe(3);
    } finally { store.close(); }
  });
  it('persists queued work, snapshot and request IDs across restart; interrupts only unfinished reads', () => {
    const dir = mkdtempSync(join(tmpdir(), 'second-look-research-')); const file = join(dir, 'case.sqlite');
    try {
      let store = createStore(file);
      store.saveResearch({ ...run(), status: 'dispatching', input });
      store.saveResearch({ ...run(), id: 'fetch-one', status: 'fetching' });
      store.close(); store = createStore(file);
      expect(store.research('run-one')).toMatchObject({ status: 'dispatching', writeRequestId: 'write-one', input });
      expect(store.research('fetch-one').status).toBe('blocked');
      store.close();
    } finally { rmSync(dir, { recursive: true }); }
  });
  it('rejects counterparty access and cross-origin writes before provider calls', async () => {
    const store = createStore(':memory:');
    const server = createApp(store).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const other = await fetch(base + '/api/case/research', { headers: { 'x-demo-role': 'gp' } });
      expect(other.status).toBe(403);
      const external = await fetch(base + '/api/case/research', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://untrusted.test', 'x-demo-role': 'lp' }, body: '{}' });
      expect(external.status).toBe(403);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
  });
});
