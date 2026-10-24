import type { CaseView, Role } from '../shared/contracts';

export const roleLabels: Record<Role, string> = { lp: 'Investor', gp: 'Fund manager', buyer: 'Buyer' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
// Display only. Every amount shown comes from the server in integer cents.
export const usd = (cents: number) => money.format(cents / 100);

// Parses a dollar string into integer cents without floating point. Blank is unknown (null), never zero.
export function toCents(value: string, optional = false): number | null {
  const text = value.trim();
  if (!text && optional) return null;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text)) throw new Error('Enter amounts in dollars, without commas, with at most two decimal places.');
  const [dollars, cents = ''] = text.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

// Fills an input from server cents using integer math only.
export const centsToInput = (cents: number) => `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

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

// The manager response is a labeled scenario input, never inferred from player data.
export const SCENARIO_DISTRIBUTION_CENTS = 10_000_000;
export const scenarioAnswer = (game: string) =>
  `Illustrative manager response for ${game}: under the scenario's assumed contractual rights, commercial proceeds flow to the fund. An illustrative distribution notice allocates $100,000 to this LP interest. This is not calculated from player counts or the holding's share of fund NAV. Whether the seller keeps it depends on the written sale terms; review the current offer.`;
