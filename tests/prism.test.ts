import { afterEach, expect, it, vi } from 'vitest';
import { traceReview } from '../server/adapters/prism.js';
const input = { sessionId: 'run-1', model: 'model', prompt: { evidence: 'Synthetic' }, output: 'Proposed question', latencyMs: 123.4 };
afterEach(() => vi.unstubAllEnvs());
it('does not pretend a missing connection is verified', async () => {
  vi.stubEnv('PRISM_TRACE_KEY', ''); vi.stubEnv('PRISMTRACE_API_KEY', '');
  const fetcher = vi.fn(); expect(await traceReview(input, fetcher)).toEqual({ status: 'not_configured' }); expect(fetcher).not.toHaveBeenCalled();
});
it('records the real request and keeps trace failure separate from review success', async () => {
  vi.stubEnv('PRISM_TRACE_KEY', 'test-key'); vi.stubEnv('PRISM_PROJECT_ID', 'project');
  const fetcher = vi.fn(async (_url, options) => {
    const body = JSON.parse(options.body); expect(body.session_id).toBe('run-1'); expect(body.input_messages[0].content).not.toContain('test-key');
    expect(options.redirect).toBe('error'); return Response.json({ id: 'recorded-trace' });
  });
  expect(await traceReview(input, fetcher as typeof fetch)).toEqual({ status: 'recorded', id: 'recorded-trace' });
  expect(await traceReview(input, vi.fn(async () => new Response('private error', { status: 403 })))).toEqual({ status: 'failed' });
});
