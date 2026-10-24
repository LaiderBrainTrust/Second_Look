import type { AktaAdapter, ExternalFinding } from './contracts.js';

type JsonObject = Record<string, unknown>;
export interface Company { uuid: string; name: string; website: string }
export class AktaError extends Error {
  constructor(message: string, public readonly status = 502) { super(message); }
}
const object = (value: unknown): JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const text = (value: unknown): string => typeof value === 'string' ? value : '';
function companies(value: unknown): Company[] {
  if (!Array.isArray(value)) throw new AktaError('Akta returned an unexpected company response.');
  return value.flatMap(row => {
    const item = object(row);
    return typeof item.uuid === 'string' && typeof item.name === 'string'
      ? [{ uuid: item.uuid, name: item.name, website: text(item.website) }] : [];
  });
}
function domain(value: string) {
  try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}
export function validateCutoff(after: string) {
  const timestamp = Date.parse(`${after}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(after) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== after || timestamp > Date.now()) {
    throw new AktaError('Choose a valid report cutoff date, YYYY-MM-DD, no later than today.', 400);
  }
}
export function normalizeNews(value: unknown, companyId: string, after: string, retrievedAt: string): ExternalFinding[] {
  if (!Array.isArray(value)) throw new AktaError('Akta returned an unexpected news response.');
  const seen = new Set<string>();
  return value.flatMap(row => {
    const item = object(row);
    const publishedAt = text(item.published_date);
    const date = publishedAt.slice(0, 10);
    const sourceUrl = text(item.url);
    const title = text(item.title);
    const mention = Array.isArray(item.company_mentions)
      ? item.company_mentions.map(object).find(company => company.uuid === companyId) : undefined;
    // A company mentioned elsewhere in a result is not evidence about our selected company.
    if (!mention || !text(mention.name) || !title || !Number.isFinite(Date.parse(publishedAt)) || date <= after || date > retrievedAt.slice(0, 10)) return [];
    try { if (!['https:', 'http:'].includes(new URL(sourceUrl).protocol)) return []; } catch { return []; }
    if (seen.has(sourceUrl)) return [];
    seen.add(sourceUrl);
    return [{ companyId, companyName: text(mention.name), publishedAt,
      claim: title, retrievedAt,
      source: { id: `akta:${String(item.id ?? sourceUrl)}`, label: title, kind: 'external' as const, url: sourceUrl },
    }];
  });
}

export function createAktaClient(options: { apiKey?: string; fetcher?: typeof fetch; onResult?: (ok: boolean, detail: string) => void } = {}) {
  const fetcher = options.fetcher ?? fetch;
  async function request(path: string, params: Record<string, string> = {}, body?: unknown): Promise<JsonObject> {
    const key = options.apiKey ?? process.env.AKTA_API_KEY;
    if (!key) throw new AktaError('AKTA_API_KEY is not configured on the server.', 503);
    const url = new URL(`https://api.akta.pro/api/v1/${path}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    try {
      const response = await fetcher(url, { method: body ? 'POST' : 'GET', redirect: 'error',
        headers: { 'x-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new AktaError(`Akta returned HTTP ${response.status}. Check access, credits, or retry later.`);
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || Array.isArray(result) || !('data' in result)) throw new AktaError('Akta returned an unexpected response.');
      options.onResult?.(true, `Live ${path} request succeeded at ${new Date().toISOString()}.`);
      return object(result);
    } catch (error) {
      // Never surface provider response bodies, credentials, or raw fetch errors.
      const safe = error instanceof AktaError ? error : new AktaError('Akta request failed or timed out. Retry later.');
      options.onResult?.(false, safe.message);
      throw safe;
    }
  }
  const client = {
    async search(query: string) {
      return companies((await request('company/search/', { query })).data);
    },
    async discover(query: string, limit = 5) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new AktaError('Choose a discovery limit between 1 and 10.', 400);
      const data = await request('list/generate/companies/', {}, { query, limit });
      return { companies: companies(data.data), creditsConsumed: data.credits_consumed ?? null,
        warnings: data.warnings ?? [], skippedSections: data.skipped_sections ?? [],
        interpretedFilters: data.filters ?? {}, matchStatus: 'Candidates; requested criteria still require verification.' };
    },
    async enrichment(companyId: string) {
      return (await request('company/enrichment/', { company: companyId, sections: 'firmographic,management_profile' })).data;
    },
    async news(companyId: string, after: string) {
      validateCutoff(after);
      const retrievedAt = new Date().toISOString();
      const data = await request('news/', { company: companyId, start_date: after, end_date: retrievedAt.slice(0, 10), limit: '10', unique_article: 'true' });
      return { findings: normalizeNews(data.data, companyId, after, retrievedAt), retrievedAt,
        // One bounded page; never claim a complete search of all news.
        coverage: 'First page, at most 10 articles; matching company mentions after the report cutoff.',
        totalAvailable: typeof data.total === 'number' ? data.total : null };
    },
    async findSubsequentEvents(company: { name: string; domain?: string }, after: string): Promise<ExternalFinding[]> {
      validateCutoff(after);
      const results = await client.search(company.domain ?? company.name);
      const matches = results.filter(candidate => company.domain
        ? domain(candidate.website) === domain(company.domain)
        : candidate.name.toLowerCase() === company.name.toLowerCase());
      if (matches.length !== 1) throw new AktaError('Company identity is ambiguous. Select the correct Akta company ID before researching.', 409);
      return (await client.news(matches[0].uuid, after)).findings;
    },
  } satisfies AktaAdapter & Record<string, unknown>;
  return client;
}
