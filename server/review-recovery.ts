import type { ResearchRun } from '../shared/research.js';
import { createRoundtableAdapter } from './adapters/roundtable.js';
import { recordProviderResult } from './adapters/status.js';
import type { createStore } from './store.js';

type Store = ReturnType<typeof createStore>;
type Reviewer = Pick<ReturnType<typeof createRoundtableAdapter>, 'result'>;

// Both the browser's existing /check route and server recovery share this lane.
// Recovery reads existing tasks only: it never dispatches, shares or approves.
export function createReviewRecovery(store: Store, reviewer: Reviewer = createRoundtableAdapter()) {
  const active = new Map<string, Promise<ResearchRun>>();
  const attempts = new Map<string, { next: number; failures: number }>();
  let closed = false;
  let ticking = false;

  function check(id: string): Promise<ResearchRun> {
    const pending = active.get(id);
    if (pending) return pending;
    const run = store.research(id);
    if (closed || !run.taskId || !['queued', 'blocked'].includes(run.status)) return Promise.resolve(run);
    const work = Promise.resolve().then(async () => {
      try {
        const result = await reviewer.result(run);
        if (closed) return run;
        const current = store.research(id);
        // Never let an old in-flight read overwrite a newer task, accepted
        // result, or an explicit state change in the meantime.
        if (current.taskId !== run.taskId || !['queued', 'blocked'].includes(current.status)) return current;
        attempts.set(id, { next: Date.now() + 10_000, failures: 0 });
        return store.saveResearch({ ...current, error: undefined, ...result });
      } catch (error) {
        if (!closed) {
          const current = store.research(id);
          if (current.taskId === run.taskId && current.status === 'queued') {
            store.saveResearch({ ...current, error: 'The saved review is still pending. Checking again automatically; your work is preserved.' });
          }
          const failures = Math.min((attempts.get(id)?.failures ?? 0) + 1, 5);
          attempts.set(id, { failures, next: Date.now() + Math.min(10_000 * 2 ** failures, 120_000) });
          recordProviderResult('roundtable', false, 'Could not read a pending review. The server will retry with backoff; no new task was created.');
        }
        throw error;
      } finally { active.delete(id); }
    });
    active.set(id, work);
    return work;
  }

  async function tick() {
    if (closed || ticking) return;
    ticking = true;
    try {
      const pending = store.queuedResearch();
      const ids = new Set(pending.map(run => run.id));
      for (const id of attempts.keys()) if (!ids.has(id)) attempts.delete(id);
      const due = pending.filter(run => (attempts.get(run.id)?.next ?? 0) <= Date.now())
        .sort((a, b) => (attempts.get(a.id)?.next ?? 0) - (attempts.get(b.id)?.next ?? 0)).slice(0, 3);
      await Promise.allSettled(due.map(run => check(run.id)));
    } finally { ticking = false; }
  }

  return { check, tick, close: () => { closed = true; } };
}

export function startReviewRecovery(recovery: ReturnType<typeof createReviewRecovery>, intervalMs = 10_000) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const step = async () => {
    try { await recovery.tick(); }
    catch { recordProviderResult('roundtable', false, 'Review recovery could not scan saved work. It will retry.'); }
    finally { if (!stopped) { timer = setTimeout(() => { void step(); }, intervalMs); timer.unref(); } }
  };
  timer = setTimeout(() => { void step(); }, 0);
  timer.unref();
  return () => { stopped = true; if (timer) clearTimeout(timer); recovery.close(); };
}
