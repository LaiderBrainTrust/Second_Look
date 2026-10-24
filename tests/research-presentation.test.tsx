import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResearchProposal, SponsorProof, matchingResearch } from '../src/ResearchProposal';
import type { ResearchRun } from '../shared/research';
import { GAMING_HOLDINGS } from '../shared/gaming';

const run = (): ResearchRun => ({
  id: 'run', caseId: 'sample-fund', caseRevision: 1, company: { uuid: 'c', name: 'Studio', website: '' }, after: '2026-09-30',
  status: 'done', createdAt: '2026-10-24T12:00:00Z', writeRequestId: 'write', dispatchRequestId: 'dispatch',
  selectedFindingId: 'steam:sample', findings: [{ companyId: 'c', companyName: 'Studio', claim: 'The actual saved source claim.', publishedAt: '2026-10-24T12:00:00Z', retrievedAt: '2026-10-24T12:00:00Z', source: { id: 'steam:sample', kind: 'external', label: 'Steam', url: 'https://store.steampowered.com/app/2198150' } }],
  gamingContext: { holding: GAMING_HOLDINGS[0], news: [], priority: 'Watch', reason: 'Unknown', snapshotId: 'snap', ownershipDisclosure: 'Fictional' },
  result: { caseId: 'sample-fund', caseRevision: 1, findingId: 'steam:sample', question: 'Actual returned question?', explanation: 'Actual returned relevance.', method: 'rule-based', sources: [], trace: { status: 'failed' } },
});
it('renders the actual proposal and evidence without claiming missing sponsors succeeded', () => {
  const r = run();
  const html = renderToStaticMarkup(<><ResearchProposal run={r}/><SponsorProof run={r}/></>);
  for (const text of ['Actual returned question?', 'Actual returned relevance.', 'The actual saved source claim.', 'No company news articles saved', 'Nicrron was not used', 'Trace failed', 'No complete task and input receipt']) expect(html).toContain(text);
  expect(html).not.toContain('Trace recorded.');
});
it('renders all four saved sponsor receipts without consulting live connections', () => {
  const r = run();
  r.gamingContext!.profile = { name: 'Studio', description: 'Saved company context', retrievedAt: r.createdAt };
  r.taskId = 'task-receipt'; r.inputSource = { bank: 'team', path: 'input.json', version: 'v1' };
  r.result = { ...r.result!, method: 'nicrron', model: 'saved-model', modelRequestId: 'model-receipt', sources: [r.inputSource, { bank: 'team', path: 'output.json', version: 'v2' }], trace: { status: 'recorded', id: 'trace-receipt' } };
  const html = renderToStaticMarkup(<SponsorProof run={r}/>);
  for (const text of ['Saved company context', 'task-receipt', 'input.json', 'output.json', 'saved-model', 'trace-receipt']) expect(html).toContain(text);
});
it('does not substitute another game, snapshot or case version for the selected research', () => {
  const r = run(), selection = { holdingId: GAMING_HOLDINGS[0].id, snapshotId: 'snap' };
  expect(matchingResearch([r], 1, selection)).toEqual([r]);
  expect(matchingResearch([r], 2, selection)).toEqual([]);
  expect(matchingResearch([r], 1, { ...selection, snapshotId: 'replacement' })).toEqual([]);
  expect(matchingResearch([r], 1, { ...selection, holdingId: GAMING_HOLDINGS[1].id })).toEqual([]);
});
it('explains small samples without inventing a decline', () => {
  const r = run();
  const window = { count: 3, positive: 2, positivePercent: 66.7, from: r.after, to: r.createdAt, excerpts: [] };
  r.gamingContext!.steam = { appId: 1, game: 'Tiny Glade', developers: [], publishers: [], sourceUrl: 'https://store.steampowered.com', retrievedAt: r.createdAt, current: window, baseline: window, deltaPoints: null, playersNow: 10 };
  const html = renderToStaticMarkup(<ResearchProposal run={r}/>);
  expect(html).toContain('Too few reviews'); expect(html).not.toContain('shows a decline');
});
it('preserves the saved no-large-change assessment for a small sample movement', () => {
  const r = run();
  const window = { count: 100, positive: 97, positivePercent: 97, from: r.after, to: r.createdAt, excerpts: [] };
  r.gamingContext!.reason = 'No large deterioration in these sampled reviews.';
  r.gamingContext!.steam = { appId: 1, game: 'Tiny Glade', developers: [], publishers: [], sourceUrl: 'https://store.steampowered.com', retrievedAt: r.createdAt, current: window, baseline: window, deltaPoints: -2, playersNow: 10 };
  expect(renderToStaticMarkup(<ResearchProposal run={r}/>)).toContain('No large deterioration');
});
