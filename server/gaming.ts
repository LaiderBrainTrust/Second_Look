import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { GAMING_HOLDINGS, GAMING_DISCLOSURE, type GamingSnapshot, type HoldingEvidence, type StudioProfile } from '../shared/gaming.js';
import type { Finding, ResearchRun } from '../shared/research.js';
import { createAktaClient } from './adapters/akta.js';
import { fetchSteam } from './adapters/steam.js';
import { recordProviderResult } from './adapters/status.js';
import { DomainError } from './domain.js';
import type { CaseStore } from './store.js';

export function studioProfile(value: unknown): StudioProfile {
  const raw = value as { firmographic?: Record<string, unknown> };
  const info = raw?.firmographic;
  if (!info || typeof info.name !== 'string') throw new Error('Studio profile unavailable.');
  let website: string | undefined;
  if (typeof info.website === 'string') {
    try { const url = new URL(info.website.includes('://') ? info.website : `https://${info.website}`); if (url.protocol === 'https:' || url.protocol === 'http:') website = url.href; } catch { /* no unsafe link */ }
  }
  const ownership = info.ownership_category as { label?: unknown } | undefined;
  return { name: info.name, description: typeof info.company_description === 'string' ? info.company_description.slice(0, 5000) : 'No description returned.',
    website, ownership: typeof ownership?.label === 'string' ? ownership.label : undefined,
    headcount: typeof info.headcount_range === 'string' ? info.headcount_range : undefined,
    foundedYear: typeof info.founded_year === 'number' ? info.founded_year : undefined, retrievedAt: new Date().toISOString() };
}
export function rankHoldings(items: HoldingEvidence[]): HoldingEvidence[] {
  const described = items.map(item => {
    const delta = item.steam?.deltaPoints;
    const priority: HoldingEvidence['priority'] = !item.steam ? 'Evidence missing' : delta !== null && delta !== undefined && delta <= -10 ? 'Investigate' : 'Watch';
    const reason = !item.steam ? 'Steam evidence could not be retrieved. Resolve the gap before drawing a conclusion.'
      : delta === null ? 'Too few reviews in one of the sampled windows to compare sentiment reliably.'
      : delta !== undefined && delta <= -10 ? `Positive reviews fell ${Math.abs(delta)} percentage points in the sampled windows. Ask whether this affects the manager’s commercial assumptions.`
      : 'No large deterioration in these sampled reviews. Revenue, ownership rights and distributions still require manager evidence.';
    return { ...item, priority, reason };
  });
  const order = { Investigate: 0, 'Evidence missing': 1, Watch: 2 };
  return described.sort((a, b) => order[a.priority] - order[b.priority] || (a.steam?.deltaPoints ?? 0) - (b.steam?.deltaPoints ?? 0) || b.holding.fundNavExposurePercent - a.holding.fundNavExposurePercent)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}
export function gamingRouter(store: CaseStore) {
  const router = Router();
  const akta = createAktaClient({ onResult: (ok, detail) => recordProviderResult('akta', ok, detail) });
  router.use((_req, res, next) => {
    if (res.locals.role !== 'lp') { res.status(403).json({ error: 'Gaming research is private to the investor until a question is shared.' }); return; }
    next();
  });
  router.get('/', (_req, res) => res.json({ snapshot: store.latestGaming(), savedSnapshot: store.latestUsableGaming(), holdings: GAMING_HOLDINGS, disclosure: GAMING_DISCLOSURE }));
  router.post('/refresh', async (req, res, next) => {
    try {
      const state = store.current(req.body.expectedRevision);
      const pending = store.latestGaming();
      if (pending?.status === 'fetching') { res.status(202).json(pending); return; }
      const snapshot: GamingSnapshot = { id: randomUUID(), caseRevision: state.revision, createdAt: new Date().toISOString(), reportCutoff: '2026-09-30', status: 'fetching', holdings: [] };
      store.saveGaming(snapshot);
      res.status(202).json(snapshot);
      // Save the work before fetching; restart recovery marks interrupted snapshots explicitly.
      const holdings = await Promise.all(GAMING_HOLDINGS.map(async holding => {
        const [steam, news, profile] = await Promise.allSettled([fetchSteam(holding, snapshot.reportCutoff), akta.news(holding.companyId, snapshot.reportCutoff), akta.enrichment(holding.companyId).then(studioProfile)]);
        return { holding, ...(profile.status === 'fulfilled' ? { profile: profile.value } : {}), ...(steam.status === 'fulfilled' ? { steam: steam.value } : {}), news: news.status === 'fulfilled' ? news.value.findings : [],
          errors: [profile.status === 'rejected' ? 'Akta studio profile unavailable.' : '', steam.status === 'rejected' ? 'Steam unavailable; no review metrics inferred.' : '', news.status === 'rejected' ? 'Akta unavailable; news coverage unknown.' : ''].filter(Boolean),
          priority: 'Watch' as const, reason: '', rank: 0 };
      }));
      store.saveGaming({ ...snapshot, status: 'ready', holdings: rankHoldings(holdings) });
    } catch (error) { if (!res.headersSent) next(error); else {
      const pending = store.latestGaming();
      if (pending?.status === 'fetching') store.saveGaming({ ...pending, status: 'blocked', error: 'Research interrupted. Refresh to try again; saved case work is unchanged.' });
    } }
  });
  router.post('/:snapshotId/prepare', (req, res, next) => {
    try {
      const state = store.current(req.body.expectedRevision);
      const snapshot = store.gaming(String(req.params.snapshotId));
      if (snapshot.status !== 'ready') throw new DomainError(409, 'Wait for the evidence check to finish.');
      const item = snapshot.holdings.find(h => h.holding.id === req.body.holdingId);
      if (!item || (!item.steam && !item.news.length)) throw new DomainError(422, 'Select a holding with source evidence.');
      const existing = store.listResearch().find(run => run.gamingContext?.snapshotId === snapshot.id && run.gamingContext.holding.id === item.holding.id && run.caseRevision === state.revision);
      if (existing) { res.json(existing); return; }
      const steam = item.steam;
      const finding: Finding = steam ? {
        companyId: item.holding.companyId, companyName: item.holding.studio, publishedAt: steam.retrievedAt, retrievedAt: steam.retrievedAt,
        claim: `${item.holding.game}: sampled English Steam reviews after ${snapshot.reportCutoff}: ${steam.current.positivePercent ?? 'unknown'}% positive (${steam.current.count} reviews), compared with ${steam.baseline.positivePercent ?? 'unknown'}% (${steam.baseline.count} reviews) in the preceding 30 days. This measures sampled review sentiment, not sales, profit or fund value.`,
        source: { id: `steam:${snapshot.id}:${item.holding.appId}`, label: `${item.holding.game} — dated Steam observation`, kind: 'external', url: steam.sourceUrl },
      } : item.news[0];
      const run: ResearchRun = { id: randomUUID(), caseId: state.id, caseRevision: state.revision, createdAt: new Date().toISOString(),
        company: { uuid: item.holding.companyId, name: item.holding.studio, website: steam?.sourceUrl ?? '' }, after: snapshot.reportCutoff,
        status: 'ready', findings: [finding, ...item.news.filter(n => n.source.id !== finding.source.id)], coverage: 'Saved Steam samples and first-page Akta news; fictional fund ownership.',
        selectedFindingId: finding.source.id, writeRequestId: randomUUID(), dispatchRequestId: randomUUID(),
        gamingContext: { holding: item.holding, steam, profile: item.profile, news: item.news, priority: item.priority, reason: item.reason, snapshotId: snapshot.id, ownershipDisclosure: GAMING_DISCLOSURE } };
      res.json(store.saveResearch(run));
    } catch (error) { next(error); }
  });
  return router;
}
