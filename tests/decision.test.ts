import { expect, it } from 'vitest';
import { seedCase } from '../server/domain.js';
import { analyzeDecision, requestDecisionAnswer } from '../server/decision.js';
import { createStore } from '../server/store.js';
import { emptyDiligence } from '../server/diligence.js';
import type { ComparisonOffer } from '../shared/diligence.js';

export const offer = (id: string, price: number, recipient: 'seller' | 'buyer'): ComparisonOffer => ({ id, buyer: id, version: 1, purchasePriceCents: price, priceAdjustmentCents: 0, sellerFeesCents: 0, distributionRecipient: recipient, distributionBasisSourceId: null, recordDate: '2026-10-24', expiresAt: null, sourceNote: 'Synthetic offer', conditions: 'Synthetic conditions', withdrawn: false });
const state = () => ({ ...seedCase(), diligence: { ...emptyDiligence(), offers: [offer('keep', 70_000_000, 'seller'), offer('assign', 76_000_000, 'buyer')] } });

it('finds the exact switch in highest cash offer, preserving ties and cents', () => {
  const result = analyzeDecision(state());
  expect(result.status).toBe('conditional'); expect(result.frontier?.tieDistributionCents).toBe(6_000_000);
  expect(result.scenarios.find(s => s.distributionCents === 5_999_999)?.highestOfferIds).toEqual(['assign']);
  expect(result.scenarios.find(s => s.distributionCents === 6_000_000)?.highestOfferIds).toEqual(['keep', 'assign']);
  expect(result.scenarios.find(s => s.distributionCents === 6_000_001)?.highestOfferIds).toEqual(['keep']);
  expect(result.nextQuestion?.text).not.toContain('60,000'); expect(result.confirmedHighestOfferIds).toEqual([]);
});
it('uses the winning frontier rather than pairwise crossings of dominated offers', () => {
  const s = state(); s.diligence.offers.push(offer('better-keep', 75_000_000, 'seller'), offer('tie-keep', 75_000_000, 'seller'));
  const r = analyzeDecision(s); expect(r.frontier?.tieDistributionCents).toBe(1_000_000);
  expect(r.frontier?.retainingOfferIds).toEqual(['better-keep','tie-keep']);
});
it('does not invent a decisive question for missing terms, mixed dates, expired or one-sided offers', () => {
  const s = state(); s.diligence.offers[0].sellerFeesCents = null;
  expect(analyzeDecision(s).nextQuestion).toBeNull(); expect(analyzeDecision(s).status).toBe('incomplete');
  s.diligence.offers[0].sellerFeesCents = 0; s.diligence.offers[0].recordDate = '2026-10-23';
  expect(analyzeDecision(s).frontier).toBeNull();
  s.diligence.offers[0].recordDate = '2026-10-24'; s.diligence.offers[0].expiresAt = '2026-10-23T00:00:00Z';
  expect(analyzeDecision(s, new Date('2026-10-24T00:00:00Z')).nextQuestion).toBeNull();
  s.diligence.offers[0].expiresAt = null; s.diligence.offers[0].distributionRecipient = 'buyer';
  expect(analyzeDecision(s).frontier).toBeNull();
});
it('includes fees and adjustments, and distinguishes dominance from a possible switch', () => {
  const s = state(); s.diligence.offers[0].sellerFeesCents = 100_000; s.diligence.offers[1].priceAdjustmentCents = -200_000;
  expect(analyzeDecision(s).frontier?.tieDistributionCents).toBe(5_900_000);
  s.diligence.offers[0].purchasePriceCents = 80_000_000;
  expect(analyzeDecision(s).frontier?.withinSupportedRange).toBe(false); expect(analyzeDecision(s).nextQuestion).toBeNull();
});
it('requires current evidence confirmation before calling the comparison confirmed', () => {
  const s = state(); s.answer = { version: 1, text: 'Synthetic', distributionCents: 10_000_000, source: {id:'notice', kind:'user',label:'notice'} };
  expect(analyzeDecision(s).status).toBe('conditional');
  s.diligence.offers.forEach(o => { o.distributionBasisSourceId = 'notice'; });
  const r = analyzeDecision(s); expect(r.status).toBe('confirmed'); expect(r.confirmedHighestOfferIds).toEqual(['keep']); expect(r.nextQuestion).toBeNull();
  s.answer.source.id = 'replacement'; expect(analyzeDecision(s).status).toBe('conditional');
});
it('saves the public question without leaking private thresholds and enforces revisions', () => {
  const store = createStore(':memory:');
  try {
    store.db.prepare('UPDATE cases SET body=? WHERE id=?').run(JSON.stringify(state()), 'sample-fund');
    const result = requestDecisionAnswer(store, 1);
    expect(result.revision).toBe(2); expect(result.question).toContain('2026-10-24'); expect(result.question).not.toContain('60,000');
    expect(() => requestDecisionAnswer(store, 1)).toThrow('changed');
    expect(requestDecisionAnswer(store, 2).revision).toBe(2);
  } finally { store.close(); }
});
