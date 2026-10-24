import { Router } from 'express';
import type { WorkspaceAccess } from './workspace-access.js';
import type { createStore } from './store.js';
import type { createReviewRecovery } from './review-recovery.js';
import { DomainError, view, type Command } from './domain.js';
import { decisionRecordRouter } from './decision-record.js';
import { diligenceRouter } from './diligence.js';
import { caseResearchRouter } from './case-research.js';
import { researchRouter } from './research.js';
import { decisionRouter } from './decision.js';
import type { AgentAccess } from './agent-access.js';

export function workspaceRouter(store: ReturnType<typeof createStore>, access: WorkspaceAccess, origin: string, recovery?: ReturnType<typeof createReviewRecovery>, agents?: AgentAccess) {
  const router = Router();
  router.use((_req, res, next) => {
    if (res.locals.session?.mode !== 'account') { res.status(401).json({ error: 'Sign in to an individual account to open your cases.' }); return; }
    res.setHeader('Cache-Control', 'no-store'); next();
  });
  router.get('/', (_req, res) => res.json({ cases: access.listCases(res.locals.session.user.id) }));
  router.post('/', (req, res, next) => {
    try { res.status(201).json(view(access.createCase(res.locals.session.user.id, req.body ?? {}), 'lp')); }
    catch (error) { next(error); }
  });
  // Each router captures one immutable store scope; concurrent requests never switch a shared "current case".
  const routes = new Map<string, Router>();
  router.use('/:caseId', (req, res, next) => {
    try {
      const caseId = String(req.params.caseId);
      res.locals.actor = access.membership(caseId, res.locals.session.user.id);
      res.locals.role = res.locals.actor.role;
      let route = routes.get(caseId);
      if (!route) {
        const scoped = store.forCase(caseId);
        route = Router();
        route.get('/', (_req, res) => res.json(view(scoped.read(), res.locals.role)));
        route.use('/decision-record', decisionRecordRouter(scoped));
        route.use('/diligence', diligenceRouter(scoped));
        route.use('/decision', decisionRouter(scoped));
        if (agents) {
          route.get('/agent-keys', (_req, res) => res.json({ keys: agents.list(caseId, res.locals.session.user.id) }));
          route.post('/agent-keys', (req, res, next) => {
            try { res.status(201).json(agents.issue(caseId, res.locals.session.user.id, req.body?.label, req.body?.scope)); } catch (error) { next(error); }
          });
          route.post('/agent-keys/:id/revoke', (req, res) => { agents.revoke(caseId, res.locals.session.user.id, String(req.params.id)); res.json({ ok: true }); });
        }
        route.use('/research', (req, res, next) => {
          if (req.method !== 'GET' && !scoped.read().allowExternalResearch) { res.status(403).json({ error: 'External research is not enabled for this case. The owner must explicitly allow sponsor processing in the case settings.' }); return; }
          next();
        });
        route.use('/research/lookup', (req, res, next) => {
          if (res.locals.role !== 'lp') { res.status(403).json({ error: 'Research is private to the investor.' }); return; }
          next();
        }, researchRouter([origin]));
        route.use('/research', caseResearchRouter(scoped, recovery));
        route.post('/commands', (req, res, next) => {
          try {
            const { expectedRevision, command } = req.body ?? {};
            if (!Number.isSafeInteger(expectedRevision) || !command || !['answer', 'revise', 'approve', 'set_question', 'revise_offer'].includes(command.kind)) throw new DomainError(400, 'Invalid command or revision.');
            res.json(view(scoped.command(res.locals.role, expectedRevision, command as Command, res.locals.actor), res.locals.role));
          } catch (error) { next(error); }
        });
        route.post('/external-research', (req, res, next) => {
          try { res.json(view(access.researchConsent(caseId, res.locals.session.user.id, req.body?.expectedRevision, req.body?.enabled), 'lp')); } catch (error) { next(error); }
        });
        route.get('/members', (_req, res, next) => {
          try { res.json({ members: access.members(caseId, res.locals.session.user.id), invitations: access.invitations(caseId, res.locals.session.user.id), events: access.accessEvents(caseId, res.locals.session.user.id) }); } catch (error) { next(error); }
        });
        route.post('/invitations', (req, res, next) => {
          try {
            const invitation = access.invite(caseId, res.locals.session.user.id, req.body ?? {});
            res.status(201).json({ ...invitation, acceptanceUrl: `${origin}/#invite=${invitation.token}` });
          } catch (error) { next(error); }
        });
        route.post('/invitations/:id/revoke', (req, res, next) => {
          try { access.revokeInvite(caseId, res.locals.session.user.id, String(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
        });
        route.post('/members/:id/revoke', (req, res, next) => {
          try { access.revokeMember(caseId, res.locals.session.user.id, String(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
        });
        routes.set(caseId, route);
      }
      route(req, res, next);
    } catch (error) { next(error); }
  });
  return router;
}
