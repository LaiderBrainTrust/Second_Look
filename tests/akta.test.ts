import { describe, expect, it, vi } from 'vitest';
import { createAktaClient, normalizeNews, validateCutoff } from '../server/adapters/akta.js';

const article = { id: 1, title: 'Company announces financing', published_date: '2026-10-23T10:00:00', url: 'https://news.test/story', company_mentions: [{ uuid: 'company1', name: 'Target' }] };
describe('Akta evidence boundaries', () => {
  it('keeps dated, cited company matches and removes stale, unrelated, duplicate and unsafe sources', () => {
    const results = normalizeNews([article, article,
      { ...article, url: 'https://news.test/old', published_date: '2026-09-30T12:00:00' },
      { ...article, url: 'javascript:alert(1)' },
      { ...article, url: 'https://news.test/other', company_mentions: [{ uuid: 'another', name: 'Other' }] },
      { ...article, url: 'https://news.test/future', published_date: '2099-01-01' },
    ], 'company1', '2026-09-30', '2026-10-24T12:00:00Z');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ companyId: 'company1', claim: article.title, source: { url: article.url, kind: 'external' } });
  });
  it('refuses impossible report dates', () => {
    expect(() => validateCutoff('2026-02-30')).toThrow('valid report cutoff');
    expect(() => validateCutoff('tomorrow')).toThrow('valid report cutoff');
  });
  it('does not select the first fuzzy company match', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { uuid: '1', name: 'Target', website: 'target.test' }, { uuid: '2', name: 'Target', website: 'other.test' },
    ] })));
    const client = createAktaClient({ apiKey: 'test-key', fetcher });
    await expect(client.findSubsequentEvents({ name: 'Target' }, '2026-01-01')).rejects.toThrow('ambiguous');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('sends keys only in headers, refuses redirects and suppresses provider error bodies', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('secret reflected by upstream', { status: 401 }));
    const client = createAktaClient({ apiKey: 'test-key', fetcher });
    await expect(client.search('Target')).rejects.toThrow('HTTP 401');
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain('test-key');
    expect(options).toMatchObject({ redirect: 'error', headers: { 'x-api-key': 'test-key' } });
  });
});
