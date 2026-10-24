import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResearchResult, ResearchRun } from '../shared/research.js';
const call = vi.hoisted(() => vi.fn());
vi.mock('@roundtable/sdk', () => ({ Roundtable: class { call = call; } }));
import { createRoundtableAdapter } from '../server/adapters/roundtable.js';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
const inputSource = { bank: 'test', path: 'second-look/sample-fund/run/input.json', version: 'input-v1' };
const outputSource = { bank: 'test', path: 'second-look/reviews/task.json', version: 'output-v1' };
const run: ResearchRun = { id: 'run', caseId: 'sample-fund', caseRevision: 1, company: { uuid: 'company', name: 'Studio', website: '' }, after: '2026-09-30', status: 'blocked', createdAt: '2026-10-24', findings: [], selectedFindingId: 'finding', taskId: 'task', inputSource, writeRequestId: 'write', dispatchRequestId: 'dispatch', error: 'Previous mismatch' };
const data: ResearchResult = { caseId: 'sample-fund', caseRevision: 1, findingId: 'finding', question: 'Who receives the proceeds?', explanation: 'Ask for contractual evidence.', method: 'nicrron', sources: [], trace: { id: 'trace', status: 'recorded' } };
function arrange(savedTraceId = 'trace') {
  vi.stubEnv('ROUNDTABLE_APP_KEY', 'test-key');
  call.mockImplementation(async (tool: string) => tool === 'get_task'
    ? { status: 'done', result: { data, sources: [inputSource, outputSource] } }
    : { content: JSON.stringify({ ...data, trace: { status: 'recorded', id: savedTraceId } }) });
}
afterEach(() => { vi.unstubAllEnvs(); call.mockReset(); });
describe('Roundtable saved trace verification', () => {
  it('compares trace meaning independently of JSON field order', async () => {
    arrange(); expect((await createRoundtableAdapter().result(run)).status).toBe('done');
  });
  it('rejects an actual trace ID mismatch', async () => {
    arrange('different-trace'); expect((await createRoundtableAdapter().result(run)).status).toBe('blocked');
  });
  it('rechecks a blocked saved result without re-dispatching and clears the old error', async () => {
    arrange(); const store = createStore(':memory:'); store.saveResearch(run);
    const server = createApp(store).listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/case/research/run/check`, { method: 'POST', headers: { 'x-demo-role': 'lp', 'Content-Type': 'application/json' }, body: '{}' });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'done', result: { trace: { id: 'trace', status: 'recorded' } } });
      expect(store.research('run').error).toBeUndefined();
      expect(call.mock.calls.map(args => args[0])).toEqual(['get_task', 'read_file']);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
  });
});
