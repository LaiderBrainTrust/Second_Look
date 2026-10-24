import { afterEach, describe, expect, it, vi } from 'vitest';
import { reviewWithNicrron } from '../server/adapters/nicrron.js';
import type { ResearchInput } from '../shared/research.js';

const input: ResearchInput = { caseId: 'sample-fund', caseRevision: 7, runId: 'run-test', after: '2026-09-30',
  offer: { version: 2, purchasePriceCents: 70000000, distributionRecipient: 'buyer' },
  finding: { companyId: 'test-company', companyName: 'Sample', publishedAt: '2026-10-22', retrievedAt: '2026-10-24', claim: 'Reported financing', source: { id: 'source-1', label: 'Article', kind: 'external', url: 'https://news.test/story' } } };
afterEach(() => vi.unstubAllEnvs());
describe('Nicrron reviewer', () => {
  it('keeps model prose separate from authoritative case identity and terms', async () => {
    vi.stubEnv('NICRRON_API_KEY', 'test-credential');
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit | undefined) => {
      expect(options?.redirect).toBe('error');
      const body = JSON.parse(String(options?.body));
      expect(body.messages[0].content).toContain('untrusted evidence');
      expect(body.messages[1].content).not.toContain('purchasePriceCents');
      return new Response(JSON.stringify({ model: 'test-model', id: 'test-request', choices: [{ message: { content: JSON.stringify({ question: 'Does this affect the distribution?', explanation: 'A claim to investigate, not confirmed materiality.', caseRevision: 99, purchasePriceCents: 0 }) } }] }));
    }) as typeof fetch;
    const result = await reviewWithNicrron(input, fetcher);
    expect(result).toMatchObject({ caseRevision: 7, caseId: 'sample-fund', findingId: 'source-1', method: 'nicrron', modelRequestId: 'test-request' });
    expect(result).not.toHaveProperty('purchasePriceCents');
  });
  it('fails without a key and does not call the provider', async () => {
    vi.stubEnv('NICRRON_API_KEY', ''); const fetcher = vi.fn();
    await expect(reviewWithNicrron(input, fetcher)).rejects.toThrow('NICRRON_API_KEY');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects malformed model output and hides provider error details', async () => {
    vi.stubEnv('NICRRON_API_KEY', 'test-credential');
    for (const response of [new Response('private provider error', { status: 401 }), new Response(JSON.stringify({ choices: [{ message: { content: '{"question":"","explanation":1}' } }] }))]) {
      await expect(reviewWithNicrron(input, vi.fn(async () => response) as typeof fetch)).rejects.toThrow('no model result was saved');
    }
  });
});
