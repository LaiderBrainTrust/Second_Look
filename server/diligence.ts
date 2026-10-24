import { Router } from 'express';
import type { CaseState, Role } from '../shared/contracts.js';
import type { ClosingCondition, ComparisonOffer, DiligenceCommand, DiligenceItem, DiligenceState, DiligenceView, OfferComparison } from '../shared/diligence.js';
import { DomainError, diligenceBlockers, money } from './domain.js';
import type { createStore } from './store.js';

export const emptyDiligence = (): DiligenceState => ({ offers: [], questions: [], conditions: [], history: [] });
const text = (value: unknown, label: string, max = 2000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DomainError(400, `${label} must contain 1–${max} characters.`);
  return value.trim();
};
const id = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) throw new DomainError(400, 'Use an item ID of 1–64 letters, digits, hyphens or underscores.');
  return value;
};
function timestamp(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new DomainError(400, 'Use an ISO UTC timestamp or null for an unknown deadline.');
  const normalized = new Date(value).toISOString();
  if (normalized.slice(0, 19) !== value.slice(0, 19)) throw new DomainError(400, 'Use a valid calendar date and time.');
  return normalized;
}
function date(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value) || !Number.isFinite(Date.parse(value + 'T00:00:00Z')) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) throw new DomainError(400, 'Use a valid YYYY-MM-DD record date or null.');
  return value;
}
function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new DomainError(400, 'Provide an explicit true or false.');
  return value;
}
function nullableMoney(value: unknown, signed = false): number | null {
  if (value === null) return null;
  if (signed && typeof value === 'number' && value < 0) return -money(-value);
  return money(value);
}
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError(400, 'Provide a valid item.');
}
function requireInvestor(role: Role) {
  if (role !== 'lp') throw new DomainError(403, 'Only the investor can change private diligence or resolve questions.');
}

export function compareOffers(state: CaseState, now = new Date()): OfferComparison {
  const offers = (state.diligence?.offers ?? []).map(offer => {
    const missing: string[] = [];
    if (offer.priceAdjustmentCents === null) missing.push('Price adjustment');
    if (offer.sellerFeesCents === null) missing.push('Seller fees');
    if (offer.distributionRecipient === null) missing.push('Distribution recipient');
    if (!state.answer || offer.distributionBasisSourceId !== state.answer.source.id) missing.push('Confirmation against the current manager answer');
    if (offer.recordDate === null) missing.push('Record date');
    const expired = offer.expiresAt !== null && Date.parse(offer.expiresAt) <= now.getTime();
    let netBeforeTaxCents: number | null = null;
    if (!missing.length) {
      const total = offer.purchasePriceCents + offer.priceAdjustmentCents! - offer.sellerFeesCents!
        + (offer.distributionRecipient === 'seller' ? state.answer!.distributionCents : 0);
      if (Number.isSafeInteger(total)) netBeforeTaxCents = total;
      else missing.push('Amount within safe calculation bounds');
    }
    return { ...offer, netBeforeTaxCents, missing, expired };
  });
  const active = offers.filter(o => !o.withdrawn);
  const reasons: string[] = [];
  if (active.length < 2) reasons.push('Add at least two active offers to compare.');
  if (active.some(o => o.missing.length)) reasons.push('Resolve missing terms and confirm each offer against the current manager answer.');
  if (active.some(o => o.expired)) reasons.push('An offer has expired. Obtain updated terms or mark it withdrawn.');
  if (new Set(active.map(o => o.recordDate)).size > 1) reasons.push('Record dates differ. Align the comparison basis before ranking offers.');
  const comparisonReady = reasons.length === 0;
  const maxNet = Math.max(...active.map(o => o.netBeforeTaxCents ?? -Infinity));
  const maxHeadline = Math.max(...active.map(o => o.purchasePriceCents));
  return {
    offers, comparisonReady, reasons,
    highestNetOfferIds: comparisonReady ? active.filter(o => o.netBeforeTaxCents === maxNet).map(o => o.id) : [],
    highestHeadlineOfferIds: active.filter(o => o.purchasePriceCents === maxHeadline).map(o => o.id),
    assumptions: 'Illustrative USD cash before tax: purchase payment + explicit price adjustment + the current manager-confirmed distribution if retained by seller − stated seller fees. Record dates must match and every offer must be confirmed against the current answer before ranking. Financing, timing, collectability, other conditions and tax are not priced. A ranking is not a recommendation or acceptance.',
  };
}

export function diligenceView(state: CaseState, role: Role, now = new Date()): DiligenceView {
  const d = state.diligence ?? emptyDiligence();
  return {
    caseId: state.id, revision: state.revision, asOf: now.toISOString(),
    questions: d.questions.filter(q => role === 'lp' || q.owner === role).map(q => ({ ...q, overdue: q.status !== 'resolved' && q.dueAt !== null && Date.parse(q.dueAt) <= now.getTime() })),
    ...(role === 'lp' ? { privateDiligence: {
      comparison: compareOffers(state, now),
      conditions: d.conditions.map(c => ({ ...c, overdue: c.status === 'pending' && c.dueAt !== null && Date.parse(c.dueAt) <= now.getTime() })),
      blockers: diligenceBlockers(state), history: d.history,
    } } : {}),
  };
}

export function applyDiligence(state: CaseState, role: Role, expected: number, command: DiligenceCommand, now = new Date()): CaseState {
  if (state.revision !== expected) throw new DomainError(409, 'This case changed. Refresh and review the current version.');
  object(command);
  const next = structuredClone(state);
  const d = next.diligence ??= emptyDiligence();
  // Bound growth without silently pruning evidence from the decision history.
  if (d.history.length >= 1000) throw new DomainError(422, 'This case has reached its diligence history limit. Export its record before continuing in a new case.');
  if (command.kind !== 'answer_question') requireInvestor(role);
  let item: DiligenceItem;
  let event: string;
  if (command.kind === 'save_offer') {
    object(command.offer);
    const o = command.offer;
    const offerId = id(o.id);
    const existing = d.offers.find(x => x.id === offerId);
    if (!existing && d.offers.length >= 20) throw new DomainError(422, 'This case supports up to 20 comparison offers.');
    if (o.distributionRecipient !== null && !['seller', 'buyer'].includes(o.distributionRecipient)) throw new DomainError(400, 'Select seller, buyer or null for the distribution recipient.');
    const basis = o.distributionBasisSourceId === null ? null : text(o.distributionBasisSourceId, 'Distribution basis', 200);
    if (basis !== null && basis !== state.answer?.source.id) throw new DomainError(409, 'Confirm this offer against the current manager answer, or leave its distribution basis unresolved.');
    const offer: ComparisonOffer = {
      id: offerId, buyer: text(o.buyer, 'Buyer', 120), purchasePriceCents: money(o.purchasePriceCents),
      priceAdjustmentCents: nullableMoney(o.priceAdjustmentCents, true), sellerFeesCents: nullableMoney(o.sellerFeesCents),
      distributionRecipient: o.distributionRecipient, distributionBasisSourceId: basis,
      recordDate: date(o.recordDate), expiresAt: timestamp(o.expiresAt),
      sourceNote: text(o.sourceNote, 'Offer source'), conditions: text(o.conditions, 'Closing conditions'),
      withdrawn: flag(o.withdrawn), version: (existing?.version ?? 0) + 1,
    };
    d.offers = [...d.offers.filter(x => x.id !== offerId), offer];
    item = offer; event = `Investor saved comparison offer ${offerId} version ${offer.version}. The current deal was not replaced.`;
  } else if (command.kind === 'add_question') {
    object(command.question);
    const q = command.question;
    const questionId = id(q.id);
    if (d.questions.some(x => x.id === questionId)) throw new DomainError(409, 'A question with this ID already exists.');
    if (d.questions.length >= 50) throw new DomainError(422, 'This case supports up to 50 tracked questions.');
    if (!['lp', 'gp', 'buyer'].includes(q.owner)) throw new DomainError(400, 'Choose an investor, manager or buyer owner.');
    item = { id: questionId, question: text(q.question, 'Question'), owner: q.owner, dueAt: timestamp(q.dueAt), status: 'open', answer: null, resolution: null };
    d.questions.push(item);
    event = `Investor assigned question ${questionId} to ${q.owner}. It is visible to that participant inside this case; no external message was sent.`;
  } else if (['answer_question', 'resolve_question', 'reopen_question'].includes(command.kind)) {
    if (!('id' in command)) throw new DomainError(400, 'Provide a question ID.');
    const questionId = id(command.id);
    const q = d.questions.find(x => x.id === questionId);
    if (!q || (role !== 'lp' && q.owner !== role)) throw new DomainError(404, 'Question not found for this participant.');
    if (command.kind === 'answer_question') {
      if (q.owner !== role) throw new DomainError(403, 'Only the assigned participant can answer this question.');
      if (q.status === 'resolved') throw new DomainError(409, 'The investor must reopen this question before its answer can change.');
      q.answer = { text: text(command.text, 'Answer', 5000), by: role, at: now.toISOString() }; q.status = 'answered';
      event = `Assigned participant answered question ${questionId}. Investor resolution is still required.`;
    } else if (command.kind === 'resolve_question') {
      if (!q.answer) throw new DomainError(422, 'Obtain an answer before resolving this question.');
      q.resolution = text(command.note, 'Resolution'); q.status = 'resolved';
      event = `Investor resolved question ${questionId} after reviewing its answer.`;
    } else if (command.kind === 'reopen_question') {
      if (q.status !== 'resolved') throw new DomainError(409, 'Only a resolved question can be reopened.');
      q.resolution = text(command.note, 'Reason for reopening'); q.status = 'open'; q.answer = null;
      event = `Investor reopened question ${questionId}. Its earlier answer remains in history.`;
    } else throw new DomainError(400, 'Invalid question command.');
    item = q;
  } else if (command.kind === 'save_condition') {
    object(command.condition);
    const c = command.condition;
    const conditionId = id(c.id);
    if (!d.conditions.some(x => x.id === conditionId) && d.conditions.length >= 50) throw new DomainError(422, 'This case supports up to 50 closing conditions.');
    if (!['gp_consent', 'right_of_first_refusal', 'record_date', 'transfer_fee', 'other'].includes(c.kind)) throw new DomainError(400, 'Choose a supported condition kind.');
    if (!['pending', 'satisfied', 'not_applicable'].includes(c.status)) throw new DomainError(400, 'Choose a supported condition status.');
    const evidenceNote = c.evidenceNote === null ? null : text(c.evidenceNote, 'Evidence note');
    if (c.status !== 'pending' && evidenceNote === null) throw new DomainError(422, 'Record supporting evidence before marking a condition satisfied or not applicable.');
    const condition: ClosingCondition = { id: conditionId, kind: c.kind, title: text(c.title, 'Condition', 300), owner: text(c.owner, 'Condition owner', 120), dueAt: timestamp(c.dueAt), required: flag(c.required), status: c.status, evidenceNote };
    d.conditions = [...d.conditions.filter(x => x.id !== conditionId), condition];
    item = condition; event = `Investor recorded condition ${conditionId} as ${condition.status}. This is a recorded assertion, not legal consent or execution.`;
  } else throw new DomainError(400, 'Invalid diligence command.');
  next.revision++;
  d.history.push({ revision: next.revision, at: now.toISOString(), by: role, kind: command.kind, item: structuredClone(item) });
  next.events.push({ revision: next.revision, at: now.toISOString(), text: event });
  return next;
}

export function diligenceRouter(store: ReturnType<typeof createStore>) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/', (_req, res) => res.json(diligenceView(store.read(), res.locals.role)));
  router.post('/commands', (req, res, next) => {
    try {
      const { expectedRevision, command } = req.body ?? {};
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new DomainError(400, 'Provide the current case revision.');
      res.json(diligenceView(store.diligenceCommand(res.locals.role, expectedRevision, command), res.locals.role));
    } catch (error) { next(error); }
  });
  return router;
}
