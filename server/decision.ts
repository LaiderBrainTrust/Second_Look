import { Router } from 'express';
import type { CaseState } from '../shared/contracts.js';
import type { DecisionAnalysis } from '../shared/decision.js';
import { compareOffers } from './diligence.js';
import { DomainError, view } from './domain.js';
import type { CaseStore } from './store.js';

const MAX_DISTRIBUTION = 1_000_000_000_000;
const usd = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);

// For the supported cash model every offer is base + (0 or 1) * distribution.
// Only the largest base in each group can be on the winning frontier. This
// avoids suggesting a crossover between two offers dominated by a third.
export function analyzeDecision(state: CaseState, now = new Date()): DecisionAnalysis {
  const comparison = compareOffers(state, now);
  const excluded: DecisionAnalysis['excluded'] = [];
  const active = comparison.offers.filter(o => !o.withdrawn);
  const dates = new Set(active.map(o => o.recordDate).filter(Boolean));
  const eligible = active.filter(o => {
    const reasons = o.missing.filter(m => m !== 'Confirmation against the current manager answer');
    if (o.expired) reasons.push('Offer expired');
    if (dates.size > 1) reasons.push('Record dates differ; align them before a cash comparison');
    if (reasons.length) excluded.push({ offerId: o.id, reasons });
    return reasons.length === 0;
  });
  const rows = eligible.map(o => ({ id: o.id, retains: o.distributionRecipient === 'seller', base: o.purchasePriceCents + o.priceAdjustmentCents! - o.sellerFeesCents! }));
  const keep = rows.filter(r => r.retains), assign = rows.filter(r => !r.retains);
  const result: DecisionAnalysis = {
    caseId: state.id, revision: state.revision,
    status: excluded.length || rows.length < 2 ? 'incomplete' : comparison.comparisonReady ? 'confirmed' : 'conditional',
    excluded, eligibleOfferIds: rows.map(r => r.id), recordDate: eligible[0]?.recordDate ?? null,
    offers: active.map(o => ({ id: o.id, buyer: o.buyer, purchasePriceCents: o.purchasePriceCents, priceAdjustmentCents: o.priceAdjustmentCents, sellerFeesCents: o.sellerFeesCents, distributionRecipient: o.distributionRecipient, recordDate: o.recordDate, sourceNotePreview: o.sourceNote.slice(0, 300), sourceNoteTruncated: o.sourceNote.length > 300 })),
    pairs: [], frontier: null, nextQuestion: null, confirmedHighestOfferIds: comparison.highestNetOfferIds, scenarios: [],
    assumptions: 'Conditional USD cash arithmetic for entered active offers: payment + adjustment - seller fees + retained distribution. Same record date required. Taxes, payment timing, financing, collectability and execution risk are not priced. A threshold is not a probability, fair value, recommendation or realized saving. Excluded offers may change the result.',
  };
  // Pairwise presentation uses this same server-owned eligibility and cash model.
  // It never changes the all-offer winning frontier or the primary sale.
  for (let i = 0; i < active.length; i++) {
    for (const b of active.slice(i + 1)) {
      const a = active[i];
      const ar = rows.find(row => row.id === a.id), br = rows.find(row => row.id === b.id);
      const reasons = [a, b].flatMap(o => excluded.find(e => e.offerId === o.id)?.reasons.map(r => `${o.buyer}: ${r}`) ?? []);
      const complete = Boolean(ar && br);
      const confirmed = complete && comparison.comparisonReady;
      const threshold = complete && ar!.retains !== br!.retains
        ? (ar!.retains ? br!.base - ar!.base : ar!.base - br!.base) : null;
      result.pairs.push({
        offerIds: [a.id, b.id],
        status: !complete ? 'incomplete' : confirmed ? 'confirmed' : 'conditional',
        reasons: complete && !confirmed ? comparison.reasons : reasons,
        cashCents: confirmed ? [a.netBeforeTaxCents!, b.netBeforeTaxCents!] : null,
        differenceCents: confirmed ? a.netBeforeTaxCents! - b.netBeforeTaxCents! : null,
        tieDistributionCents: threshold !== null && threshold >= 0 && threshold <= MAX_DISTRIBUTION ? threshold : null,
        retainingOfferId: threshold !== null ? (ar!.retains ? a.id : b.id) : null,
      });
    }
  }
  if (!keep.length || !assign.length) return result;
  const maxKeep = Math.max(...keep.map(o => o.base)), maxAssign = Math.max(...assign.map(o => o.base));
  const threshold = maxAssign - maxKeep;
  const retainingOfferIds = keep.filter(o => o.base === maxKeep).map(o => o.id);
  const assigningOfferIds = assign.filter(o => o.base === maxAssign).map(o => o.id);
  result.frontier = {
    retainingOfferIds, assigningOfferIds, tieDistributionCents: threshold,
    withinSupportedRange: threshold >= 0 && threshold <= MAX_DISTRIBUTION,
    explanation: threshold < 0
      ? 'The strongest distribution-retaining offer pays more even at a zero distribution, within the entered assumptions.'
      : `Among eligible offers, the strongest retaining and assigning offers tie at a ${usd(threshold)} distribution. Below that, assigning pays more; above it, retaining pays more.`,
  };
  const points = new Set([0, ...(threshold >= 0 && threshold <= MAX_DISTRIBUTION ? [threshold, Math.max(0, threshold - 1), Math.min(MAX_DISTRIBUTION, threshold + 1)] : []), ...(state.answer ? [state.answer.distributionCents] : [])]);
  result.scenarios = [...points].sort((a, b) => a - b).map(distributionCents => {
    const netBeforeTaxCents = Math.max(...rows.map(r => r.base + (r.retains ? distributionCents : 0)));
    return { distributionCents, netBeforeTaxCents, highestOfferIds: rows.filter(r => r.base + (r.retains ? distributionCents : 0) === netBeforeTaxCents).map(r => r.id) };
  });
  if (!excluded.length && threshold >= 0 && threshold <= MAX_DISTRIBUTION && !comparison.comparisonReady) {
    result.nextQuestion = {
      owner: 'gp',
      // Counterparties must not receive private competing bids or the threshold.
      text: `What distribution amount is attributable to this LP interest on the ${result.recordDate} comparison basis? Please identify the supporting notice, applicable dates, and whether it is confirmed or only expected.`,
      privateReason: `The relative cash outcome changes at ${usd(threshold)}. Confirm the amount and each offer's entitlement before ranking.`,
    };
  }
  return result;
}

export function requestDecisionAnswer(store: CaseStore, revision: number, actor?: Parameters<CaseStore['command']>[3]) {
  const state = store.current(revision);
  const analysis = analyzeDecision(state);
  if (!analysis.nextQuestion) throw new DomainError(422, 'Resolve offer inputs first, or review the current confirmed comparison. No decisive distribution request is available.');
  if (state.question === analysis.nextQuestion.text && !state.answer) return state;
  return store.command('lp', revision, { kind: 'set_question', text: analysis.nextQuestion.text, sourceNote: 'Distribution confirmation requested for the stated comparison basis.' }, actor);
}

export function decisionRouter(store: CaseStore) {
  const router = Router();
  router.use((_req, res, next) => { if (res.locals.role !== 'lp') { res.status(403).json({ error: 'Offer comparison is private to the investor.' }); return; } next(); });
  router.get('/', (_req, res) => res.json(analyzeDecision(store.read())));
  router.post('/request', (req, res, next) => {
    try { res.json(view(requestDecisionAnswer(store, req.body?.expectedRevision, res.locals.actor), 'lp')); } catch (error) { next(error); }
  });
  return router;
}
