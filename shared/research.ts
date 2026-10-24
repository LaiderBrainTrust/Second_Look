import type { SourceRef } from './contracts.js';

export interface Company { uuid: string; name: string; website: string }
export interface Finding {
  companyId: string; companyName: string; publishedAt: string; claim: string;
  source: SourceRef; retrievedAt: string;
}
export interface VersionSource { bank: string; path: string; version: string }
export interface ResearchResult {
  caseId: string; caseRevision: number; findingId: string;
  question: string; explanation: string; method: 'rule-based' | 'nicrron'; sources: VersionSource[];
  model?: string; modelRequestId?: string;
}
export interface ResearchRun {
  id: string; caseId: string; caseRevision: number; company: Company; after: string;
  status: 'fetching' | 'ready' | 'dispatching' | 'queued' | 'done' | 'blocked';
  createdAt: string; findings: Finding[]; coverage?: string; selectedFindingId?: string;
  taskId?: string; inputSource?: VersionSource; result?: ResearchResult; error?: string;
  input?: ResearchInput;
  acceptedRevision?: number; writeRequestId: string; dispatchRequestId: string;
}
export interface ResearchInput {
  caseId: string; caseRevision: number; runId: string; after: string; finding: Finding;
  offer: { version: number; purchasePriceCents: number; distributionRecipient: 'seller' | 'buyer' };
}
