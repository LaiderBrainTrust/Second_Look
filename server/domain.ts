import type { CaseState, CaseView, Role } from '../shared/contracts.js';

export class DomainError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function money(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1_000_000_000_000) {
    throw new DomainError(400, 'Use a non-negative amount in whole cents, within the demo limit.');
  }
  return value as number;
}
export function grossReceipts(state: CaseState): number | null {
  if (!state.answer || state.offer.priceAdjustmentCents === null) return null;
  const gross = state.offer.purchasePriceCents + state.offer.priceAdjustmentCents
    + (state.offer.distributionRecipient === 'seller' ? state.answer.distributionCents : 0);
  return Number.isSafeInteger(gross) && gross >= 0 ? gross : null;
}
export function responseText(state: CaseState): string {
  const total = grossReceipts(state);
  const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cents / 100);
  return total === null
    ? 'The distribution or price adjustment remains unresolved. Obtain the missing terms before reviewing this response.'
    : `Offer v${state.offer.version}: ${usd(state.offer.purchasePriceCents)} purchase payment; distribution goes to the ${state.offer.distributionRecipient}. ${state.mode === 'user' ? 'Calculated' : 'Scenario'} gross receipts: ${usd(total)}. Taxes, fees and timing are excluded. Please confirm these terms in the written agreement.`;
}
export function diligenceBlockers(state: CaseState): string[] {
  return [
    ...(state.diligence?.questions ?? []).filter(q => q.status !== 'resolved').map(q => `Resolve question: ${q.question}`),
    ...(state.diligence?.conditions ?? []).filter(c => c.required && c.status === 'pending').map(c => `Confirm condition: ${c.title}`),
  ];
}
export function view(state: CaseState, role: Role): CaseView {
  const currentApproval = state.reviews.some(r => r.revision === state.revision);
  const status = !state.answer ? 'awaiting_answer' : currentApproval ? 'approved' : state.reviews.length ? 'terms_changed' : 'needs_review';
  return {
    id: state.id, title: state.title, revision: state.revision, offer: state.offer,
    ...(state.mode ? { mode: state.mode } : {}),
    question: state.question, questionSource: state.questionSource, researchContext: state.researchContext, answer: state.answer, nextOwner: state.answer ? 'lp' : 'gp',
    ...(role === 'lp' ? { privateReview: {
      lastTermChange: state.lastTermChange, ownerEntity: state.ownerEntity, report: state.report, grossReceiptsCents: grossReceipts(state),
      responseText: responseText(state), status, reviews: state.reviews, events: state.events,
      ...(state.mode === 'user' ? { allowExternalResearch: state.allowExternalResearch ?? false } : {}),
      ...(state.diligence ? { diligenceBlockers: diligenceBlockers(state) } : {}),
    } } : {}),
  };
}
export function seedCase(): CaseState {
  return {
    id: 'sample-fund', title: 'Waypoint Games Fund II — fictional case', ownerEntity: 'Example Family Trust (fictional)',
    revision: 1,
    report: { id: 'fictional-report', label: 'Synthetic quarterly report — not imported from X1', kind: 'synthetic', locator: 'Prepared fixture' },
    offer: {
      version: 1, purchasePriceCents: 70_000_000, currency: 'USD', distributionRecipient: 'seller', priceAdjustmentCents: 0,
      source: { id: 'fictional-offer-v1', label: 'Synthetic offer v1', kind: 'synthetic' },
    },
    question: 'Is a distribution attributable to this LP interest expected, and does the seller retain it in addition to the unchanged purchase payment?',
    answer: null, reviews: [], events: [],
  };
}
export type Command =
  | { kind: 'answer'; distributionCents: number; text: string }
  | { kind: 'revise'; distributionRecipient: 'seller' | 'buyer' }
  | { kind: 'set_question'; text: string; sourceNote: string }
  | { kind: 'revise_offer'; purchasePriceCents: number; priceAdjustmentCents: number | null; distributionRecipient: 'seller' | 'buyer'; sourceNote: string }
  | { kind: 'approve' };

export function applyCommand(state: CaseState, role: Role, expectedRevision: number, command: Command): CaseState {
  if (expectedRevision !== state.revision) throw new DomainError(409, 'This case changed. Refresh and review the current version.');
  const required: Record<Command['kind'], Role> = { answer: 'gp', revise: 'buyer', approve: 'lp', set_question: 'lp', revise_offer: 'buyer' };
  if (role !== required[command.kind]) throw new DomainError(403, 'This participant cannot perform that action.');
  const next = structuredClone(state);
  let event = '';
  if (command.kind === 'approve') {
    if (grossReceipts(next) === null) throw new DomainError(422, 'Resolve the distribution and adjustment before approving a response.');
    if (diligenceBlockers(next).length) throw new DomainError(422, 'Resolve tracked questions and required closing conditions before approving this version.');
    if (!next.reviews.some(r => r.revision === next.revision)) {
      next.reviews.push({ revision: next.revision, responseText: responseText(next), approvedAt: new Date().toISOString(),
        question: next.question, answer: structuredClone(next.answer!),
        researchContext: next.researchContext ? structuredClone(next.researchContext) : undefined,
        ...(next.diligence ? { diligence: structuredClone(next.diligence) } : {}) });
    }
    return next;
  }
  next.revision++;
  const userSource = (label: string) => ({ id: `${next.id}-${next.revision}`, label, kind: 'user' as const });
  if (command.kind === 'set_question') {
    if (typeof command.text !== 'string' || !command.text.trim() || command.text.length > 5000 || typeof command.sourceNote !== 'string' || !command.sourceNote.trim() || command.sourceNote.length > 2000) throw new DomainError(400, 'Provide a question and its source reference.');
    next.question = command.text.trim(); next.questionSource = userSource(command.sourceNote.trim());
    next.answer = null; next.researchContext = undefined;
    event = 'Investor shared a new question. A fresh manager answer and review are required.';
  } else if (command.kind === 'answer') {
    money(command.distributionCents);
    if (typeof command.text !== 'string' || !command.text.trim() || command.text.length > 5000) throw new DomainError(400, 'Provide a response of 1–5,000 characters.');
    next.answer = { version: (next.answer?.version ?? 0) + 1, distributionCents: command.distributionCents, text: command.text.trim(),
      source: state.mode === 'user' ? userSource('Answer entered by the assigned fund-manager account') : { id: `fictional-answer-${next.revision}`, label: 'Participant-entered fictional answer', kind: 'synthetic' } };
    event = 'Fund-manager response updated. The LP must review this version.';
  } else {
    if (!['seller', 'buyer'].includes(command.distributionRecipient)) throw new DomainError(400, 'Select seller or buyer.');
    let changes = {};
    if (command.kind === 'revise_offer') {
      const purchasePriceCents = money(command.purchasePriceCents);
      const value = command.priceAdjustmentCents;
      const priceAdjustmentCents = value === null ? null : typeof value === 'number' && value < 0 ? -money(-value) : money(value);
      if (typeof command.sourceNote !== 'string' || !command.sourceNote.trim() || command.sourceNote.length > 2000) throw new DomainError(400, 'Provide the offer source reference.');
      changes = { purchasePriceCents, priceAdjustmentCents };
    }
    next.offer = { ...next.offer, ...changes, version: next.offer.version + 1, distributionRecipient: command.distributionRecipient,
      source: state.mode === 'user' ? userSource(command.kind === 'revise_offer' ? command.sourceNote.trim() : 'Terms changed by the assigned buyer account') : { id: `fictional-offer-${next.revision}`, label: `Synthetic offer v${next.offer.version + 1}`, kind: 'synthetic' } };
    next.lastTermChange = { atRevision: next.revision, previousOffer: structuredClone(state.offer), previousGrossReceiptsCents: grossReceipts(state), revisedGrossReceiptsCents: grossReceipts(next) };
    event = `Offer revised: distribution goes to the ${command.distributionRecipient}. Earlier reviews remain historical.`;
  }
  next.events.push({ revision: next.revision, text: event, at: new Date().toISOString() });
  return next;
}
