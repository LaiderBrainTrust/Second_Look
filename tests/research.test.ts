import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResearchInput, ResearchRun } from '../shared/research.js';
import { reviewInput } from '../server/adapters/roundtable.js';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
import { GAMING_HOLDINGS } from '../shared/gaming.js';

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
  it('retains the game and exact answer reviewed after a different question is shared and storage reopens', () => {
    const dir = mkdtempSync(join(tmpdir(), 'second-look-chain-'));
    const file = join(dir, 'case.sqlite');
    let store = createStore(file);
    try {
      store.saveResearch({ ...run(), gamingContext: { holding: GAMING_HOLDINGS[0], snapshotId: 'snapshot-one', news: [], priority: 'Watch', reason: 'No material change', ownershipDisclosure: 'Fictional' } });
      const shared = store.publishResearch('run-one', 1);
      expect(shared.researchContext).toMatchObject({ game: 'Tiny Glade', snapshotId: 'snapshot-one', sharedAtRevision: 2 });
      store.command('gp', 2, { kind: 'answer', distributionCents: 10000000, text: 'Fictional rights and distribution notice.' });
      store.command('lp', 3, { kind: 'approve' });
      store.command('buyer', 3, { kind: 'revise', distributionRecipient: 'buyer' });
      store.saveResearch({ ...run(), id: 'other-research', caseRevision: 4 });
      const replaced = store.publishResearch('other-research', 4);
      expect(replaced.researchContext).toBeUndefined();
      expect(replaced.answer).toBeNull();
      store.close(); store = createStore(file);
      const approval = store.read().reviews[0];
      expect(approval.revision).toBe(3);
      expect(approval.researchContext?.game).toBe('Tiny Glade');
      expect(approval.answer?.text).toBe('Fictional rights and distribution notice.');
      expect(approval.answer?.distributionCents).toBe(10000000);
      expect(approval.question).toBe(shared.question);
    } finally { store.close(); rmSync(dir, { recursive: true }); }
  });
  it('proposes a source-bound question without inventing a value or approval', () => {
    const result = reviewInput(input);
    expect(result.question).toContain('Does this change');
    expect(result.caseRevision).toBe(1);
    expect(result.method).toBe('rule-based');
    expect(() => reviewInput({ ...input, after: '2026-10-23' })).toThrow();
    expect(() => reviewInput({ ...input, finding: { ...input.finding, source: { ...input.finding.source, url: 'javascript:alert(1)' } } })).toThrow();
  });
  it('can research an offer with unknown payout ownership without assigning it to either party', () => {
    const result = reviewInput({ ...input, offer: { ...input.offer, distributionRecipient: null } });
    expect(result.question).toContain('checked separately against the sale agreement');
    expect(result.question).not.toContain('goes to the null');
    expect(() => reviewInput({ ...input, offer: { ...input.offer, distributionRecipient: undefined as never } })).toThrow();
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
