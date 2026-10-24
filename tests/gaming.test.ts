import { describe, expect, it } from 'vitest';
import { reviewWindow } from '../server/adapters/steam.js';
import { rankHoldings, studioProfile } from '../server/gaming.js';
import { GAMING_HOLDINGS, type HoldingEvidence, type GamingSnapshot } from '../shared/gaming.js';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
import { applyCommand, seedCase, view } from '../server/domain.js';

const from = '2026-10-01T00:00:00Z'; const to = '2026-10-24T23:59:59Z';
const row = (id: string, positive: boolean, at = '2026-10-10T12:00:00Z') => ({ recommendationid: id, voted_up: positive, review: 'A short review.', timestamp_created: Date.parse(at) / 1000 });
describe('bounded gaming evidence', () => {
  it('excludes out-of-window and malformed reviews, deduplicates IDs, and preserves unknown', () => {
    const result = reviewWindow({ response: { reviews: [row('1', true), row('1', true), row('2', false), row('3', false, '2026-09-01'), row('4', true, '2026-11-01'), { voted_up: true }] } }, from, to);
    expect(result.count).toBe(2); expect(result.positivePercent).toBe(50);
    expect(reviewWindow({ reviews: [] }, from, to).positivePercent).toBeNull();
    expect(() => reviewWindow({}, from, to)).toThrow();
  });
  it('ranks investigation and missing evidence without claiming valuation', () => {
    const make = (index: number, deltaPoints?: number | null): HoldingEvidence => ({ holding: GAMING_HOLDINGS[index], news: [], errors: [], priority: 'Watch', reason: '', rank: 0,
      ...(deltaPoints !== undefined ? { steam: { appId: 1, game: 'Test', developers: [], publishers: [], sourceUrl: 'https://store.steampowered.com/app/1', retrievedAt: to, current: reviewWindow({ reviews: [] }, from, to), baseline: reviewWindow({ reviews: [] }, from, to), deltaPoints, playersNow: null } } : {}) });
    const result = rankHoldings([make(0, 1), make(1), make(2, -12)]);
    expect(result.map(h => h.priority)).toEqual(['Investigate', 'Evidence missing', 'Watch']);
    expect(result[0].holding.id).toBe(GAMING_HOLDINGS[2].id);
    expect(rankHoldings([make(0, null)])[0].reason).toContain('Too few');
  });
  it('strips management/personal fields and rejects unsafe company links', () => {
    expect(studioProfile({ firmographic: { name: 'Studio', website: 'javascript:alert(1)', company_description: 'Business', ownership_category: { label: 'Private' } }, management_profile: { email: 'private' } })).toMatchObject({ name: 'Studio', description: 'Business', ownership: 'Private' });
    const profile = studioProfile({ firmographic: { name: 'Studio', website: 'javascript://alert(1)' } });
    expect(profile.website).toBeUndefined(); expect(profile).not.toHaveProperty('management_profile');
  });
  it('keeps an auditable dollar effect when terms change and excludes it from counterparty views', () => {
    const answered = applyCommand(seedCase(), 'gp', 1, { kind: 'answer', distributionCents: 10000000, text: 'Synthetic distribution.' });
    const approved = applyCommand(answered, 'lp', 2, { kind: 'approve' });
    const changed = applyCommand(approved, 'buyer', 2, { kind: 'revise', distributionRecipient: 'buyer' });
    expect(changed.lastTermChange).toMatchObject({ previousGrossReceiptsCents: 80000000, revisedGrossReceiptsCents: 70000000 });
    expect(view(changed, 'lp').privateReview?.status).toBe('terms_changed');
    expect(view(changed, 'gp')).not.toHaveProperty('privateReview');
  });
  it('makes prepared research idempotent per evidence/holding/current revision and denies other roles', async () => {
    const store = createStore(':memory:');
    const snap: GamingSnapshot = { id: 'snapshot', caseRevision: 1, createdAt: to, reportCutoff: '2026-09-30', status: 'ready', holdings: [{ holding: GAMING_HOLDINGS[0], news: [{ companyId: 'c', companyName: 'Studio', claim: 'Reported change', publishedAt: from, retrievedAt: to, source: { id: 'news', label: 'Source', kind: 'external', url: 'https://studio.test/news' } }], errors: [], priority: 'Watch', reason: '', rank: 1 }] };
    store.saveGaming(snap);
    const server = createApp(store).listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('No address');
    const url = `http://127.0.0.1:${address.port}/api/case/gaming/snapshot/prepare`;
    const prepare = (role: string, revision = 1) => fetch(url, { method: 'POST', headers: { 'x-demo-role': role, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision, holdingId: GAMING_HOLDINGS[0].id }) });
    try {
      expect((await prepare('gp')).status).toBe(403);
      const first = await (await prepare('lp')).json(); const second = await (await prepare('lp')).json();
      expect(second.id).toBe(first.id); expect(first.gamingContext.ownershipDisclosure).toContain('Fictional');
      store.command('gp', 1, { kind: 'answer', text: 'Fictional', distributionCents: 0 });
      expect((await prepare('lp')).status).toBe(409);
      const current = await (await prepare('lp', 2)).json(); expect(current.id).not.toBe(first.id); expect(current.caseRevision).toBe(2);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
  });
});
