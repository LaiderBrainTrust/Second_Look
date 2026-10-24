import { describe, expect, it } from 'vitest';
import { applyCommand, grossReceipts, seedCase, view } from '../server/domain.js';

const answer = { kind: 'answer' as const, distributionCents: 10_000_000, text: 'Fictional confirmed distribution.' };
describe('financial scenario and review continuity', () => {
  it('withholds incomplete totals and computes both explicit distribution cases', () => {
    const original = seedCase(); expect(grossReceipts(original)).toBeNull();
    const confirmed = applyCommand(original, 'gp', 1, answer); expect(grossReceipts(confirmed)).toBe(80_000_000);
    const revised = applyCommand(confirmed, 'buyer', 2, { kind: 'revise', distributionRecipient: 'buyer' });
    expect(grossReceipts(revised)).toBe(70_000_000);
    revised.offer.priceAdjustmentCents = null; expect(grossReceipts(revised)).toBeNull();
  });
  it('withholds totals and approval until an unknown payout recipient is confirmed', () => {
    const original = seedCase(); original.offer.distributionRecipient = null;
    const answered = applyCommand(original, 'gp', 1, answer);
    expect(grossReceipts(answered)).toBeNull();
    expect(() => applyCommand(answered, 'lp', 2, { kind: 'approve' })).toThrow('who keeps it');
    const confirmed = applyCommand(answered, 'buyer', 2, { kind: 'revise', distributionRecipient: 'seller' });
    expect(grossReceipts(confirmed)).toBe(80_000_000);
    const approved = applyCommand(confirmed, 'lp', 3, { kind: 'approve' });
    const uncertain = applyCommand(approved, 'buyer', 3, { kind: 'revise', distributionRecipient: null });
    expect(grossReceipts(uncertain)).toBeNull();
    expect(view(uncertain, 'lp').privateReview?.status).toBe('terms_changed');
    expect(uncertain.reviews).toHaveLength(1);
    expect(uncertain.events.at(-1)?.text).toContain('not confirmed');
    expect(() => applyCommand(uncertain, 'lp', 4, { kind: 'approve' })).toThrow('who keeps it');
  });
  it('preserves historical review without carrying it to a changed offer', () => {
    const confirmed = applyCommand(seedCase(), 'gp', 1, answer);
    const approved = applyCommand(confirmed, 'lp', 2, { kind: 'approve' });
    expect(view(approved, 'lp').privateReview?.status).toBe('approved');
    const revised = applyCommand(approved, 'buyer', 2, { kind: 'revise', distributionRecipient: 'buyer' });
    expect(revised.reviews).toHaveLength(1); expect(view(revised, 'lp').privateReview?.status).toBe('terms_changed');
    expect(() => applyCommand(revised, 'lp', 2, { kind: 'approve' })).toThrow('This case changed');
  });
  it('rejects stale worker answers, non-owner review and malformed monetary inputs', () => {
    const confirmed = applyCommand(seedCase(), 'gp', 1, answer);
    expect(() => applyCommand(confirmed, 'gp', 1, answer)).toThrow('This case changed');
    expect(() => applyCommand(confirmed, 'buyer', 2, { kind: 'approve' })).toThrow('cannot perform');
    expect(() => applyCommand(seedCase(), 'gp', 1, { ...answer, distributionCents: -1 })).toThrow('non-negative');
    expect(() => applyCommand(seedCase(), 'gp', 1, { ...answer, distributionCents: 1.5 })).toThrow('whole cents');
  });
  it('does not expose LP-private fields through counterparty projections', () => {
    for (const role of ['gp', 'buyer'] as const) {
      const result = view(seedCase(), role);
      expect(result.privateReview).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain('Example Family Trust');
    }
  });
});
