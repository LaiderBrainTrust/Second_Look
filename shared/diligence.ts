import type { Actor, Role } from './contracts.js';

export interface ComparisonOffer {
  id: string;
  buyer: string;
  purchasePriceCents: number;
  priceAdjustmentCents: number | null;
  sellerFeesCents: number | null;
  distributionRecipient: 'seller' | 'buyer' | null;
  // Explicitly pins this quote to the manager answer whose distribution it uses.
  distributionBasisSourceId: string | null;
  recordDate: string | null;
  expiresAt: string | null;
  sourceNote: string;
  conditions: string;
  withdrawn: boolean;
  version: number;
}
export interface TrackedQuestion {
  id: string;
  question: string;
  owner: Role;
  dueAt: string | null;
  status: 'open' | 'answered' | 'resolved';
  answer: { text: string; by: Role; at: string } | null;
  resolution: string | null;
}
export interface ClosingCondition {
  id: string;
  kind: 'gp_consent' | 'right_of_first_refusal' | 'record_date' | 'transfer_fee' | 'other';
  title: string;
  owner: string;
  dueAt: string | null;
  required: boolean;
  status: 'pending' | 'satisfied' | 'not_applicable';
  evidenceNote: string | null;
}
export type DiligenceItem = ComparisonOffer | TrackedQuestion | ClosingCondition;
export interface DiligenceState {
  offers: ComparisonOffer[];
  questions: TrackedQuestion[];
  conditions: ClosingCondition[];
  // Immutable snapshots retain superseded answers, terms, deadlines and resolutions.
  history: { revision: number; at: string; by: Role; kind: DiligenceCommand['kind']; item: DiligenceItem; actor?: Actor }[];
}
export type DiligenceCommand =
  | { kind: 'save_offer'; offer: Omit<ComparisonOffer, 'version'> }
  | { kind: 'add_question'; question: Pick<TrackedQuestion, 'id' | 'question' | 'owner' | 'dueAt'> }
  | { kind: 'answer_question'; id: string; text: string }
  | { kind: 'resolve_question'; id: string; note: string }
  | { kind: 'reopen_question'; id: string; note: string }
  | { kind: 'save_condition'; condition: ClosingCondition };

export interface OfferComparison {
  offers: (ComparisonOffer & { netBeforeTaxCents: number | null; missing: string[]; expired: boolean })[];
  comparisonReady: boolean;
  highestNetOfferIds: string[];
  highestHeadlineOfferIds: string[];
  reasons: string[];
  assumptions: string;
}
export interface DiligenceView {
  caseId: string;
  revision: number;
  asOf: string;
  questions: (TrackedQuestion & { overdue: boolean })[];
  privateDiligence?: {
    comparison: OfferComparison;
    conditions: (ClosingCondition & { overdue: boolean })[];
    blockers: string[];
    history: DiligenceState['history'];
  };
}
