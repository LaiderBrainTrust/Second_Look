import { analyzeFunding } from './funding.js';
import { Router } from 'express';
import type { AgentAccess } from './agent-access.js';
import type { createStore } from './store.js';
import { agentTools, type AgentToolName } from '../shared/agent-tools.js';
import { DomainError, view } from './domain.js';
import { analyzeDecision, requestDecisionAnswer } from './decision.js';
import { diligenceView } from './diligence.js';

export function agentApi(store: ReturnType<typeof createStore>, access: AgentAccess) {
  const router = Router();
  const windows = new Map<string, { start: number; count: number }>();
  router.post('/:tool', (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const bearer = req.header('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
      if (!bearer) throw new DomainError(401, 'Supply a case-scoped agent key.');
      const grant = access.authenticate(bearer);
      const now = Date.now();
      for (const [id, window] of windows) if (now - window.start >= 60000) windows.delete(id);
      const window = windows.get(grant.id) ?? { start: now, count: 0 }; windows.set(grant.id, window);
      if (++window.count > 120) throw new DomainError(429, 'Agent rate limit reached. Retry after one minute.');
      const tool = String(req.params.tool) as AgentToolName;
      if (!Object.hasOwn(agentTools, tool)) throw new DomainError(404, 'Unknown Second Look tool.');
      const config = agentTools[tool];
      const parsed = config.schema.safeParse(req.body ?? {});
      if (!parsed.success) throw new DomainError(400, 'Invalid tool arguments. Use the advertised schema and current case revision.');
      if (config.write && grant.scope !== 'work') throw new DomainError(403, 'This connection is read-only. Create an explicitly authorized work connection to save changes.');
      const scoped = store.forCase(grant.caseId), role = grant.actor.role;
      const data = parsed.data;
      if (tool === 'secondlook_read_funding') {
        if(role!=='lp') throw new DomainError(403,'Funding context is private to the investor.');
        res.json(analyzeFunding(scoped.read()));
      } else if(tool === 'secondlook_save_funding') {
        const input=agentTools.secondlook_save_funding.schema.parse(data);
        res.json({saved:true,revision:scoped.diligenceCommand(role,input.expectedRevision,{kind:'save_funding',funding:input.funding},grant.actor).revision});
      } else if (tool === 'secondlook_read_case') {
        const result = view(scoped.read(), role);
        if (result.privateReview) { result.privateReview.events = []; result.privateReview.reviews = []; }
        res.json({ role, scope: grant.scope, case: result, historyOmitted: true });
      } else if (tool === 'secondlook_compare_offers') {
        if (role !== 'lp') throw new DomainError(403, 'Offer comparison is private to the investor.');
        res.json(analyzeDecision(scoped.read()));
      } else if (tool === 'secondlook_list_questions') {
        const input = agentTools.secondlook_list_questions.schema.parse(data);
        const all = diligenceView(scoped.read(), role).questions;
        res.json({ revision: scoped.read().revision, questions: all.slice(input.offset, input.offset + input.limit), total: all.length, nextOffset: input.offset + input.limit < all.length ? input.offset + input.limit : null });
      } else if (tool === 'secondlook_request_distribution') {
        if (role !== 'lp') throw new DomainError(403, 'Only the investor may request the distribution confirmation.');
        const input = agentTools.secondlook_request_distribution.schema.parse(data);
        res.json({ saved: true, revision: requestDecisionAnswer(scoped, input.expectedRevision, grant.actor).revision });
      } else if (tool === 'secondlook_answer_distribution') {
        const input = agentTools.secondlook_answer_distribution.schema.parse(data);
        res.json({ saved: true, revision: scoped.command(role, input.expectedRevision, { kind: 'answer', distributionCents: input.distributionCents, text: input.explanation }, grant.actor).revision });
      } else if (tool === 'secondlook_answer_question') {
        const input = agentTools.secondlook_answer_question.schema.parse(data);
        res.json({ saved: true, revision: scoped.diligenceCommand(role, input.expectedRevision, { kind: 'answer_question', id: input.questionId, text: input.text }, grant.actor).revision });
      } else if (tool === 'secondlook_save_offer') {
        const input = agentTools.secondlook_save_offer.schema.parse(data);
        res.json({ saved: true, revision: scoped.diligenceCommand(role, input.expectedRevision, { kind: 'save_offer', offer: input.offer }, grant.actor).revision });
      }
    } catch (error) { next(error); }
  });
  router.use((_req, res) => res.status(404).json({ error: 'Unknown agent endpoint.' }));
  return router;
}
