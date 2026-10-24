import type { DiligenceState } from './diligence.js';
export type Role = 'lp' | 'gp' | 'buyer';
export interface Actor { userId: string; displayName: string; role: Role; agentKeyId?: string }
export type Provider = 'x1' | 'nicrron' | 'akta' | 'roundtable' | 'prism';

export interface SourceRef {
  id: string;
  label: string;
  kind: 'synthetic' | 'x1' | 'external' | 'user';
  locator?: string;
  url?: string;
  revision?: string;
}
export interface Offer {
  version: number;
  purchasePriceCents: number;
  currency: 'USD';
  distributionRecipient: 'seller' | 'buyer' | null;
  priceAdjustmentCents: number | null;
  source: SourceRef;
}
export interface Answer {
  version: number;
  text: string;
  distributionCents: number;
  source: SourceRef;
}
export interface Review {
  actor?: Actor;
  revision: number;
  responseText: string;
  approvedAt: string;
  question?: string;
  answer?: Answer;
  researchContext?: ResearchContext;
  diligence?: DiligenceState;
}
export interface ResearchContext {
  runId: string;
  snapshotId: string;
  game: string;
  studio: string;
  sharedAtRevision: number;
}
export interface TermChange {
  atRevision: number;
  previousOffer: Offer;
  previousGrossReceiptsCents: number | null;
  revisedGrossReceiptsCents: number | null;
}
export interface CaseState {
  mode?: 'user' | 'example';
  allowExternalResearch?: boolean;
  id: string;
  title: string;
  ownerEntity: string;
  revision: number;
  report: SourceRef;
  offer: Offer;
  question: string;
  questionSource?: SourceRef;
  researchContext?: ResearchContext;
  answer: Answer | null;
  lastTermChange?: TermChange;
  reviews: Review[];
  diligence?: DiligenceState;
  events: { revision: number; text: string; at: string; actor?: Actor }[];
}
export interface CaseView {
  mode?: 'user' | 'example';
  id: string;
  title: string;
  revision: number;
  offer: Offer;
  question: string;
  questionSource?: SourceRef;
  researchContext?: ResearchContext;
  answer: Answer | null;
  nextOwner: Role;
  // Private fields are omitted for GP/buyer, not merely hidden in the UI.
  privateReview?: {
    lastTermChange?: TermChange;
    ownerEntity: string;
    report: SourceRef;
    grossReceiptsCents: number | null;
    responseText: string;
    status: 'awaiting_answer' | 'needs_review' | 'approved' | 'terms_changed';
    reviews: Review[];
    events: CaseState['events'];
    diligenceBlockers?: string[];
    allowExternalResearch?: boolean;
  };
}
export interface ProviderStatus {
  provider: Provider;
  status: 'available' | 'not_implemented' | 'not_configured' | 'not_verified' | 'verified' | 'failed';
  detail: string;
}
