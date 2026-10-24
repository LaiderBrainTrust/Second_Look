import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type { ResearchRun } from '../shared/research.js';
import { createReviewRecovery, startReviewRecovery } from '../server/review-recovery.js';
import { createStore } from '../server/store.js';

function pending(id = 'pending'): ResearchRun {
  return { id, caseId: 'sample-fund', caseRevision: 1, company: { uuid: 'studio', name: 'Studio', website: '' }, after: '2026-09-30',
    status: 'queued', createdAt: '2026-10-24T10:00:00Z', findings: [], selectedFindingId: 'finding', taskId: `task-${id}`,
    writeRequestId: `write-${id}`, dispatchRequestId: `dispatch-${id}` };
}
const completed = { status: 'done' as const, result: { caseId: 'sample-fund', caseRevision: 1, findingId: 'finding',
  question: 'Who receives the distribution?', explanation: 'Confirm the contract.', method: 'nicrron' as const, sources: [] } };
afterEach(() => vi.useRealTimers());

it('recovers a queued review after restart without a browser and without changing the deal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'review-recovery-'));
  const path = join(dir, 'case.sqlite'); let store = createStore(path);
  try {
    store.saveResearch(pending());
    // Recovery must not be limited to the 30 newest rows returned to the UI.
    for (let i = 0; i < 35; i++) store.saveResearch({ ...pending(`later-${i}`), status: 'ready', createdAt: '2026-10-24T11:00:00Z' });
    const before = store.read(); store.close(); store = createStore(path);
    const result = vi.fn().mockResolvedValue(completed);
    const recovery = createReviewRecovery(store, { result });
    await recovery.tick();
    expect(result).toHaveBeenCalledOnce();
    expect(store.research('pending')).toMatchObject({ ...completed, taskId: 'task-pending', dispatchRequestId: 'dispatch-pending' });
    expect(store.read()).toEqual(before);
    await recovery.tick(); expect(result).toHaveBeenCalledOnce();
    recovery.close();
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});

it('coalesces browser/server checks and does not overwrite newer accepted state', async () => {
  const store = createStore(':memory:'); store.saveResearch(pending());
  let finish!: (value: typeof completed) => void;
  const result = vi.fn(() => new Promise<typeof completed>(resolve => { finish = resolve; }));
  const recovery = createReviewRecovery(store, { result });
  try {
    const first = recovery.check('pending'); const second = recovery.check('pending');
    await Promise.resolve();
    expect(result).toHaveBeenCalledOnce();
    store.saveResearch({ ...pending(), ...completed, acceptedRevision: 2 });
    finish(completed); await Promise.all([first, second]);
    expect(store.research('pending').acceptedRevision).toBe(2);
  } finally { recovery.close(); store.close(); }
});

it('backs off transient failures, continues other work, and never polls blocked or unconfirmed tasks automatically', async () => {
  vi.useFakeTimers();
  const store = createStore(':memory:');
  for (const id of ['transient', 'healthy', 'mismatch']) store.saveResearch(pending(id));
  store.saveResearch({ ...pending('unconfirmed'), taskId: undefined, status: 'dispatching' });
  store.saveResearch({ ...pending('blocked'), status: 'blocked' });
  const result = vi.fn(async (run: ResearchRun) => {
    if (run.id === 'transient') throw new Error('provider unavailable');
    if (run.id === 'mismatch') return { status: 'blocked' as const, error: 'Source mismatch' };
    return completed;
  });
  const recovery = createReviewRecovery(store, { result });
  try {
    await recovery.tick();
    expect(store.research('healthy').status).toBe('done');
    expect(store.research('transient')).toMatchObject({ status: 'queued', taskId: 'task-transient' });
    expect(store.research('transient').error).toContain('automatically');
    expect(store.research('mismatch').status).toBe('blocked');
    expect(result).toHaveBeenCalledTimes(3);
    await recovery.tick(); expect(result).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(20_001); await recovery.tick();
    expect(result).toHaveBeenCalledTimes(4);
    expect(result.mock.calls.map(([run]) => run.id)).not.toContain('unconfirmed');
    expect(result.mock.calls.map(([run]) => run.id)).not.toContain('blocked');
  } finally { recovery.close(); store.close(); }
});

it('starts recovery without a request and suppresses late writes after shutdown', async () => {
  vi.useFakeTimers();
  const store = createStore(':memory:'); store.saveResearch(pending());
  let finish!: (value: typeof completed) => void;
  const result = vi.fn(() => new Promise<typeof completed>(resolve => { finish = resolve; }));
  const recovery = createReviewRecovery(store, { result });
  const stop = startReviewRecovery(recovery);
  await vi.advanceTimersByTimeAsync(0);
  expect(result).toHaveBeenCalledOnce();
  stop(); store.close(); finish(completed);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(result).toHaveBeenCalledOnce();
});
