import '../server/env.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createAktaClient } from '../server/adapters/akta.js';

const client = createAktaClient();
const companyId = '0000002';
const after = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
try {
  const companies = await client.search('anthropic.com');
  if (!companies.some(company => company.uuid === companyId)) throw new Error('Expected company was not returned.');
  const news = await client.news(companyId, after);
  const receipt = { provider: 'akta', checkedAt: new Date().toISOString(), companyId,
    searchSucceeded: true, newsSucceeded: true, findingCount: news.findings.length,
    coverage: news.coverage, sourceUrls: news.findings.map(finding => finding.source.url) };
  mkdirSync('.local', { recursive: true });
  writeFileSync('.local/akta-smoke.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Akta smoke check failed.');
  process.exitCode = 1;
}
