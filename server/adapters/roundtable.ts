import { Roundtable } from '@roundtable/sdk';
import type { ResearchInput, ResearchResult, ResearchRun, VersionSource } from '../../shared/research.js';
import { recordProviderResult } from './status.js';
import { reviewWithNicrron } from './nicrron.js';

export function configured() { return Boolean(process.env.ROUNDTABLE_APP_KEY && process.env.ROUNDTABLE_PROJECT && process.env.ROUNDTABLE_WORKER_ID); }
function client(key: string | undefined) {
  if (!key) throw new Error('Roundtable credentials are not configured on the server.');
  return new Roundtable({ key, url: 'https://roundtable.bot' });
}
export function reviewInput(input: ResearchInput): Omit<ResearchResult, 'sources'> {
  if (!input || !Number.isSafeInteger(input.caseRevision) || input.caseRevision < 1 || typeof input.caseId !== 'string'
    || typeof input.finding?.claim !== 'string' || input.finding.claim.length > 5000 || !input.finding.companyId
    || !input.finding.source?.id || !Number.isSafeInteger(input.offer?.purchasePriceCents)
    || (input.offer.distributionRecipient !== null && !['buyer', 'seller'].includes(input.offer.distributionRecipient))
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.after) || !Number.isFinite(Date.parse(input.finding.publishedAt))
    || input.finding.publishedAt.slice(0, 10) <= input.after) throw new Error('Research input is incomplete or not after the report cutoff.');
  const url = new URL(input.finding.source.url ?? '');
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Research needs a valid cited source.');
  return {
    caseId: input.caseId, caseRevision: input.caseRevision, findingId: input.finding.source.id, method: 'rule-based',
    question: `The ${input.finding.companyName} article dated ${input.finding.publishedAt.slice(0, 10)} reports “${input.finding.claim}”. Does this change the fund's reported value or expected distributions supporting offer v${input.offer.version}? Please give the payout amount attributable to this fund interest and the dated notice or report supporting it. Who keeps that payout must be checked separately against the sale agreement.`,
    explanation: `The article is later than the ${input.after} report cutoff and names the selected company. This rule-based check proposes a question; it does not establish materiality, verify the publisher's claim, or change the investment value.`,
  };
}
export function createRoundtableAdapter() {
  return {
    async dispatch(run: ResearchRun, input: ResearchInput): Promise<{ taskId: string; inputSource: VersionSource }> {
      if (!configured()) throw new Error('Configure the Roundtable app key, project and reviewer ID.');
      const rt = client(process.env.ROUNDTABLE_APP_KEY); const bank = process.env.ROUNDTABLE_PROJECT!;
      // A deterministic request ID and task-specific path survive a timeout/retry.
      const path = `second-look/${run.caseId}/${run.id}/input.json`;
      const saved = await rt.call('write_file', { bank, path, content: JSON.stringify(input), message: 'Second Look review input', create_only: true, request_id: run.writeRequestId });
      const inputSource = { bank, path, version: saved.version.id };
      const task = await rt.call('claim_task', { project: bank, assignee: process.env.ROUNDTABLE_WORKER_ID!,
        goal: 'Check the selected post-report finding and propose a question for the fund manager.',
        input: { path, version: inputSource.version, caseId: run.caseId, caseRevision: run.caseRevision }, request_id: run.dispatchRequestId });
      recordProviderResult('roundtable', true, 'Live versioned input saved and review task dispatched.');
      return { taskId: task.id, inputSource };
    },
    async result(run: ResearchRun): Promise<{ status: 'queued' | 'done' | 'blocked'; result?: ResearchResult; error?: string }> {
      const task = await client(process.env.ROUNDTABLE_APP_KEY).call('get_task', { task_id: run.taskId! });
      if (task.status === 'blocked') return { status: 'blocked', error: 'The reviewer could not complete this task. Start a new research check after fixing its configuration.' };
      if (task.status !== 'done') return { status: 'queued' };
      const data = task.result?.data as Omit<ResearchResult, 'sources'> | undefined;
      const sources = task.result?.sources as VersionSource[] | undefined;
      if (!data || data.caseId !== run.caseId || data.caseRevision !== run.caseRevision || data.findingId !== run.selectedFindingId
        || typeof data.question !== 'string' || data.question.length > 8000 || typeof data.explanation !== 'string'
        || !['rule-based', 'nicrron'].includes(data.method) || !Array.isArray(sources) || !run.inputSource
        || !sources.some(s => s.bank === run.inputSource!.bank && s.path === run.inputSource!.path && s.version === run.inputSource!.version)
        || !sources.some(s => s.bank === run.inputSource!.bank && s.path === `second-look/reviews/${run.taskId}.json` && typeof s.version === 'string')) {
        return { status: 'blocked', error: 'The returned review does not match this case revision and its source versions.' };
      }
      const output = sources.find(s => s.path === `second-look/reviews/${run.taskId}.json`)!;
      const saved = await client(process.env.ROUNDTABLE_APP_KEY).call('read_file', { bank: output.bank, path: output.path, version: output.version });
      const savedResult = JSON.parse(saved.content) as ResearchResult;
      if (savedResult.trace?.status !== data.trace?.status || savedResult.trace?.id !== data.trace?.id || savedResult.question !== data.question || savedResult.explanation !== data.explanation || savedResult.method !== data.method || savedResult.model !== data.model || savedResult.modelRequestId !== data.modelRequestId || savedResult.caseId !== run.caseId || savedResult.caseRevision !== run.caseRevision || savedResult.findingId !== run.selectedFindingId) {
        return { status: 'blocked', error: 'The saved review file does not match the task result.' };
      }
      recordProviderResult('roundtable', true, 'Live review completed with matching case revision and source versions.');
      return { status: 'done', result: { ...data, sources } };
    },
  };
}

export async function runReviewer(signal: AbortSignal) {
  if (!process.env.ROUNDTABLE_WORKER_KEY || !process.env.ROUNDTABLE_PROJECT) return;
  await client(process.env.ROUNDTABLE_WORKER_KEY)
    .bot({ name: 'second-look-reviewer', project: process.env.ROUNDTABLE_PROJECT, skills: ['Check dated investment evidence and draft a fund-manager question'] })
    .onTask(async (task, ctx) => {
      const path = task.input.path; const version = task.input.version;
      if (typeof path !== 'string' || !/^second-look\/(?:sample-fund|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/[a-f0-9-]+\/input\.json$/.test(path) || typeof version !== 'string') throw new Error('Unexpected review input path.');
      const source = await ctx.read(path, { version });
      const input = JSON.parse(source.content) as ResearchInput;
      if (input.caseId !== task.input.caseId || input.caseRevision !== task.input.caseRevision) throw new Error('Task and source revisions differ.');
      reviewInput(input); // Validate source/date/terms before exposing evidence to a model.
      const result = await reviewWithNicrron(input);
      const saved = await ctx.save(`second-look/reviews/${task.id}.json`, JSON.stringify(result), 'Source-backed question proposal');
      return { summary: result.question, data: result, sources: [source.source, saved] };
    }).run({ signal, pollMs: 2000, maxIdleMs: 10000 });
}
