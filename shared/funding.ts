import { z } from 'zod';
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Use a valid calendar date');
const amount = z.number().int().min(0).max(1_000_000_000_000);
export const fundingSchema = z.object({
  ownerEntity: z.string().trim().min(1).max(200), amountCents: amount, neededBy: day,
  availableCashCents: amount.nullable(), cashAsOf: day.nullable(),
  cashConfirmedForThisEntity: z.boolean(), sourceNote: z.string().trim().min(1).max(2000),
}).strict();
export type FundingNeed = z.infer<typeof fundingSchema>;
export interface X1Evidence {
  ref: string; label: string; snippet: string; page: number | null;
  sourceDate: string | null; retrievedAt: string; query: string; contentHash: string;
  // A saved excerpt is a dated copy, not a live grant or a verified legal fact.
  origin: 'x1_mcp';
}
export interface FundingAnalysis {
  caseId: string; revision: number; funding: FundingNeed | null;
  evidence: X1Evidence[]; blockers: string[];
  cashGapCents: number | null;
  offers: { id: string; buyer: string; status: 'covers_under_assumptions'|'shortfall'|'unresolved'; cashByDeadlineCents: number | null; shortfallCents: number | null; reasons: string[] }[];
  assumptions: string;
}
