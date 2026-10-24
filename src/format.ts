import type { CaseView, Role } from '../shared/contracts';

export const roleLabels: Record<Role, string> = { lp: 'Investor', gp: 'Fund manager', buyer: 'Buyer' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
// Display only. Every amount shown comes from the server in integer cents.
export const usd = (cents: number) => money.format(cents / 100);

export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const dateTime = (value: string) => new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export const recipientLabel = (recipient: 'seller' | 'buyer') => (recipient === 'seller' ? 'the seller' : 'the buyer');

type ReviewStatus = NonNullable<CaseView['privateReview']>['status'];
export const statusLabel: Record<ReviewStatus, string> = {
  awaiting_answer: 'Waiting for the manager',
  needs_review: 'Ready for your review',
  approved: 'Reviewed for this version',
  terms_changed: 'Terms changed since your approval',
};

// The fictional manager response is a labeled scenario input, never inferred from player data.
export const SCENARIO_DISTRIBUTION_CENTS = 10_000_000;
export const scenarioAnswer = (game: string) =>
  `Fictional manager response for ${game}: under the scenario's assumed contractual rights, commercial proceeds flow to the fund. A fictional distribution notice allocates $100,000 to this LP interest. This is not calculated from player counts or the holding's share of fund NAV. Whether the seller keeps it depends on the written sale terms; review the current offer.`;
