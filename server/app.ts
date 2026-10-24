import express from 'express';
import type { Role } from '../shared/contracts.js';
import { DomainError, view, type Command } from './domain.js';
import { createStore } from './store.js';
import { providerStatuses } from './adapters/status.js';
import { researchRouter } from './research.js';
import { caseResearchRouter } from './case-research.js';
import { AktaError } from './adapters/akta.js';

export function createApp(store: ReturnType<typeof createStore>) {
  const app = express();
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'];
  if (process.env.CODESPACES === 'true' && /^[a-z0-9-]+$/.test(process.env.CODESPACE_NAME ?? '')) {
    allowedOrigins.push(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`);
  }
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
  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'local-synthetic-scaffold' }));
  app.get('/api/providers', (_req, res) => res.json(providerStatuses()));
  app.use('/api/research', researchRouter());
  app.use('/api/case', (req, res, next) => {
    // Development impersonation ONLY. Replace with real sessions before hosting.
    const role = req.header('x-demo-role');
    if (!role || !['lp', 'gp', 'buyer'].includes(role)) { res.status(401).json({ error: 'Choose a local demo role.' }); return; }
    res.locals.role = role as Role;
    next();
  });
  app.get('/api/case', (_req, res) => res.json(view(store.read(), res.locals.role)));
  app.use('/api/case/research', caseResearchRouter(store));
  app.post('/api/case/commands', (req, res, next) => {
    try {
      const { expectedRevision, command } = req.body ?? {};
      if (!Number.isInteger(expectedRevision) || !command || !['answer', 'revise', 'approve'].includes(command.kind)) throw new DomainError(400, 'Invalid command or revision.');
      const result = store.command(res.locals.role, expectedRevision, command as Command);
      res.json(view(result, res.locals.role));
    } catch (error) { next(error); }
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const known = error instanceof DomainError || error instanceof AktaError;
    res.status(known ? error.status : 500).json({ error: known ? error.message : 'The request could not be completed. Saved work is preserved; check provider access and retry.' });
  });
  return app;
}
