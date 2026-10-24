import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { ResearchRun } from '../shared/research.js';
import type { CaseStore } from './store.js';
import { DomainError, view } from './domain.js';
import { createAktaClient, validateCutoff } from './adapters/akta.js';
import { configured, createRoundtableAdapter } from './adapters/roundtable.js';
import { recordProviderResult } from './adapters/status.js';
import { createReviewRecovery } from './review-recovery.js';

export function caseResearchRouter(store: CaseStore, recovery = createReviewRecovery(store)) {
  const router = Router();
  const akta = createAktaClient({ onResult: (ok, detail) => recordProviderResult('akta', ok, detail) });
  const rt = createRoundtableAdapter(); const active = new Set<string>();
  const inputFor = (run: ResearchRun) => {
    const state = store.current(run.caseRevision);
    return { caseId: run.caseId, caseRevision: run.caseRevision, runId: run.id, after: run.after,
      gamingContext: run.gamingContext, finding: run.findings.find(f => f.source.id === run.selectedFindingId)!, offer: { version: state.offer.version, purchasePriceCents: state.offer.purchasePriceCents, distributionRecipient: state.offer.distributionRecipient } };
  };
  router.use((_req, res, next) => {
    if (res.locals.role !== 'lp') { res.status(403).json({ error: 'Research is private to the investor until they share a question.' }); return; }
    next();
  });
  router.get('/', (_req, res) => res.json({ runs: store.listResearch() }));
  router.post('/', async (req, res, next) => {
    let run: ResearchRun | undefined;
    try {
      const state = store.current(req.body.expectedRevision);
      const { companyId, after } = req.body;
      if (typeof companyId !== 'string' || !/^[a-zA-Z0-9]{1,40}$/.test(companyId) || typeof after !== 'string') throw new DomainError(400, 'Select a company and report cutoff date.');
      validateCutoff(after);
      run = { id: randomUUID(), caseId: state.id, caseRevision: state.revision, company: { uuid: companyId, name: companyId, website: '' }, after,
        status: 'fetching', createdAt: new Date().toISOString(), findings: [], writeRequestId: randomUUID(), dispatchRequestId: randomUUID() };
      store.saveResearch(run);
      const matches = await akta.search(companyId);
      const company = matches.find(c => c.uuid === companyId);
      if (!company) throw new Error('The selected company could not be resolved by Akta.');
      const news = await akta.news(companyId, after);
      run = { ...run, company, findings: news.findings, coverage: news.coverage, status: 'ready' };
      store.saveResearch(run); res.json(run);
    } catch (error) {
      if (run) store.saveResearch({ ...run, status: 'blocked', error: 'Research failed. Check the company, credentials and provider availability, then start a new check.' });
      next(error);
    }
  });
  router.post('/:id/review', async (req, res, next) => {
    const id = String(req.params.id);
    if (active.has(id)) { res.status(409).json({ error: 'This review request is already running.' }); return; }
    active.add(id);
    let run: ResearchRun | undefined;
    try {
      run = store.research(id);
      if (run.taskId) { res.json(run); return; }
      if (!configured()) throw new DomainError(503, 'Roundtable needs ROUNDTABLE_APP_KEY, ROUNDTABLE_PROJECT and ROUNDTABLE_WORKER_ID in the server environment.');
      if (!['ready', 'dispatching'].includes(run.status)) throw new DomainError(409, 'This research is not ready for review.');
      if (run.status === 'ready') {
        store.current(req.body.expectedRevision);
        if (run.caseRevision !== req.body.expectedRevision) throw new DomainError(409, 'Research belongs to an older case. Start a new check.');
      }
      const findingId = run.selectedFindingId ?? req.body.findingId;
      if (!run.findings.some(f => f.source.id === findingId)) throw new DomainError(400, 'Select a finding from this saved research.');
      run = { ...run, selectedFindingId: findingId, status: 'dispatching', error: undefined };
      const input = run.input ?? inputFor(run); run.input = input; store.saveResearch(run);
      const receipt = await rt.dispatch(run, input);
      run = { ...run, ...receipt, status: 'queued' }; store.saveResearch(run); res.json(run);
    } catch (error) {
      if (run?.status === 'dispatching') store.saveResearch({ ...run, error: 'Dispatch is unconfirmed. Retry this same request to reconcile it; do not start a duplicate.' });
      next(error);
    } finally { active.delete(id); }
  });
  router.post('/:id/check', async (req, res, next) => {
    try { store.research(String(req.params.id)); res.json(await recovery.check(String(req.params.id))); }
    catch (error) { next(error); }
  });
  router.post('/:id/share', (req, res, next) => {
    try { res.json(view(store.publishResearch(String(req.params.id), req.body.expectedRevision, res.locals.actor), 'lp')); }
    catch (error) { next(error); }
  });
  return router;
}
