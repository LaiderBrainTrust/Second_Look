import type { SourceRef } from '../../shared/contracts.js';

export interface AuthorizedInvestmentSource {
  text: string;
  sources: SourceRef[];
  ownerEntity?: string;
}
export interface X1Adapter {
  // Implementation must discover live tools/capabilities before invoking them.
  readSelectedSource(documentId: string): Promise<AuthorizedInvestmentSource>;
}
export interface ExternalFinding {
  companyId: string;
  companyName: string;
  publishedAt: string;
  claim: string;
  source: SourceRef;
  retrievedAt: string;
}
export interface AktaAdapter {
  findSubsequentEvents(company: { name: string; domain?: string }, after: string): Promise<ExternalFinding[]>;
}
export interface ReasoningAdapter {
  proposeQuestion(input: { report: AuthorizedInvestmentSource; findings: ExternalFinding[] }): Promise<string>;
}
export interface TaskAdapter {
  requestReview(input: { caseId: string; expectedRevision: number; finding: ExternalFinding }): Promise<{ taskId: string }>;
}
export interface TraceAdapter {
  record(input: { sessionId: string; model: string; input: unknown; output: unknown; latencyMs: number }): Promise<{ accepted: boolean }>;
}
