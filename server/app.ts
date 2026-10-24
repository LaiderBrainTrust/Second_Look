import { createWorkspaceAccess } from './workspace-access.js';
import { workspaceRouter } from './workspace-routes.js';
import { decisionRecordRouter } from './decision-record.js';
import { diligenceRouter } from './diligence.js';
import type { createReviewRecovery } from './review-recovery.js';
import { installHostedAuth, type HostedOptions } from './hosted-auth.js';
import express from 'express';
import type { Role } from '../shared/contracts.js';
import { DomainError, view, type Command } from './domain.js';
import { createStore } from './store.js';
import { providerStatuses } from './adapters/status.js';
import { researchRouter } from './research.js';
import { caseResearchRouter } from './case-research.js';
import { gamingRouter } from './gaming.js';
import { AktaError } from './adapters/akta.js';
import { createAgentAccess } from './agent-access.js';
import { agentApi } from './agent-api.js';
import { decisionRouter } from './decision.js';

export function createApp(store: ReturnType<typeof createStore>, options: { releaseSha?: string; rehearsal?: boolean; hosted?: HostedOptions; recovery?: ReturnType<typeof createReviewRecovery> } = {}) {
  const app = express();
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'];
  if (process.env.CODESPACES === 'true' && /^[a-z0-9-]+$/.test(process.env.CODESPACE_NAME ?? '')) {
    allowedOrigins.push(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`);
  }
  if (options.hosted) allowedOrigins.push(options.hosted.origin);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.header('origin');
      if (!req.is('application/json') || (origin && !allowedOrigins.includes(origin))) {
        res.status(403).json({ error: 'Use the local app with a JSON request.' }); return;
      }
    }
    next();
  });
  app.use(express.json({ limit: '20kb' }));
  const access = options.hosted ? createWorkspaceAccess(store.db) : undefined;
  const agentAccess = access ? createAgentAccess(store.db, access) : undefined;
  // Dedicated bearer-only route. It never inherits presenter or browser cookies.
  if (agentAccess) app.use('/api/agent', agentApi(store, agentAccess));
  if (options.hosted) installHostedAuth(app, options.hosted, access);
  else app.get('/api/session', (_req, res) => res.json({ hosted: false, authenticated: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: options.rehearsal ? 'saved-research-rehearsal' : 'local-synthetic-scaffold', ...(/^[a-f0-9]{40}$/.test(options.releaseSha ?? '') ? { releaseSha: options.releaseSha } : {}) }));
  app.get('/api/providers', (_req, res) => res.json(providerStatuses()));
  app.use('/api/research', (req, res, next) => {
    if (options.hosted && res.locals.session?.mode !== 'presenter') { res.status(403).json({ error: 'Use the research tools within a case you own.' }); return; }
    next();
  }, researchRouter(options.hosted ? [options.hosted.origin] : undefined));
  if (options.hosted && access) app.use('/api/cases', workspaceRouter(store, access, options.hosted.origin, options.recovery, agentAccess));
  app.use('/api/case', (req, res, next) => {
    // Local role simulation; hosted roles come only from the authenticated, case-scoped presenter session.
    const role = options.hosted ? res.locals.session?.role : req.header('x-demo-role');
    if (!role || !['lp', 'gp', 'buyer'].includes(role)) { res.status(401).json({ error: 'Choose a local demo role.' }); return; }
    res.locals.role = role as Role;
    next();
  });
  app.get('/api/case', (_req, res) => res.json(view(store.read(), res.locals.role)));
  app.use('/api/case/decision-record', decisionRecordRouter(store));
  app.use('/api/case/diligence', diligenceRouter(store));
  app.use('/api/case/decision', decisionRouter(store));
  app.use('/api/case/gaming', gamingRouter(store));
  app.use('/api/case/research', caseResearchRouter(store, options.recovery));
  app.post('/api/case/commands', (req, res, next) => {
    try {
      const { expectedRevision, command } = req.body ?? {};
      if (!Number.isInteger(expectedRevision) || !command || !['answer', 'revise', 'approve'].includes(command.kind)) throw new DomainError(400, 'Invalid command or revision.');
      const result = store.command(res.locals.role, expectedRevision, command as Command);
      res.json(view(result, res.locals.role));
    } catch (error) { next(error); }
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API endpoint not found.' }); });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const known = error instanceof DomainError || error instanceof AktaError;
    res.status(known ? error.status : 500).json({ error: known ? error.message : 'The request could not be completed. Saved work is preserved; check provider access and retry.' });
  });
  return app;
}
