import express from 'express';
import type { Role } from '../shared/contracts.js';
import { DomainError, view, type Command } from './domain.js';
import { createStore } from './store.js';
import { providerStatuses } from './adapters/status.js';
import { researchRouter } from './research.js';

export function createApp(store: ReturnType<typeof createStore>) {
  const app = express();
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
  app.post('/api/case/commands', (req, res, next) => {
    try {
      const { expectedRevision, command } = req.body ?? {};
      if (!Number.isInteger(expectedRevision) || !command || !['answer', 'revise', 'approve'].includes(command.kind)) throw new DomainError(400, 'Invalid command or revision.');
      const result = store.command(res.locals.role, expectedRevision, command as Command);
      res.json(view(result, res.locals.role));
    } catch (error) { next(error); }
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof DomainError ? error.status : 500).json({ error: error instanceof DomainError ? error.message : 'The request could not be completed.' });
  });
  return app;
}
