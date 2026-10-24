import { expect, it } from 'vitest';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
import { createWorkspaceAccess } from '../server/workspace-access.js';
import { createAgentAccess } from '../server/agent-access.js';

const password = 'synthetic test password 12345';
it('enforces case, user, role, work scope and revocation on every agent request', async () => {
  const store = createStore(':memory:'); const users = createWorkspaceAccess(store.db); const keys = createAgentAccess(store.db, users);
  const owner = users.register({ handle: 'owner', displayName: 'Owner', password });
  const c = users.createCase(owner.id, { requestId: 'request-first-case', title: 'Synthetic', ownerEntity: 'Synthetic', offerNote: 'Synthetic', purchasePriceCents: 70000000, priceAdjustmentCents: 0, distributionRecipient: 'seller', question: 'Distribution?', allowExternalResearch: false });
  const readonly = keys.issue(c.id, owner.id, 'Read agent', 'read'); const work = keys.issue(c.id, owner.id, 'Work agent', 'work');
  const invited = users.invite(c.id, owner.id, { role: 'gp' }); const manager = users.acceptInvite(invited.token, undefined, { handle:'manager',displayName:'Manager',password }).user;
  const gpKey = keys.issue(c.id, manager.id, 'Manager agent', 'work');
  const server = createApp(store, { hosted: { origin:'https://test.local', accessCode:'test-access-code-long-enough-123' } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw Error('No port');
  async function call(token: string, tool: string, data: unknown = {}) {
    const response = await fetch(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api/agent/${tool}`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(data) });
    return {status:response.status, data:await response.json()};
  }
  try {
    expect((await call('', 'secondlook_read_case')).status).toBe(401);
    const read = await call(readonly.token,'secondlook_read_case'); expect(read.status).toBe(200); expect(read.data.case.id).toBe(c.id);
    expect((await call(work.token,'secondlook_read_case',{caseId:'sample-fund'})).status).toBe(400);
    const answer = { expectedRevision:1,distributionCents:10000000,explanation:'Synthetic source notice confirms amount.' };
    expect((await call(readonly.token,'secondlook_answer_distribution',answer)).status).toBe(403);
    expect((await call(work.token,'secondlook_answer_distribution',answer)).status).toBe(403);
    expect((await call(gpKey.token,'secondlook_compare_offers')).status).toBe(403);
    expect((await call(gpKey.token,'secondlook_read_case')).data.case.privateReview).toBeUndefined();
    expect((await call(gpKey.token,'secondlook_read_funding')).status).toBe(403);
    expect((await call(readonly.token,'secondlook_read_funding')).status).toBe(200);
    expect((await call(readonly.token,'secondlook_save_funding',{expectedRevision:1,funding:{ownerEntity:'Synthetic',amountCents:1,neededBy:'2026-11-01',availableCashCents:null,cashAsOf:null,cashConfirmedForThisEntity:false,sourceNote:'Synthetic'}})).status).toBe(403);
    expect((await call(gpKey.token,'secondlook_answer_distribution',answer)).status).toBe(200);
    expect(store.forCase(c.id).read().events.at(-1)?.actor?.agentKeyId).toBe(gpKey.id);
    expect((await call(gpKey.token,'secondlook_answer_distribution',answer)).status).toBe(409);
    expect((await call(work.token,'secondlook_approve',{expectedRevision:2})).status).toBe(404);
    keys.revoke(c.id,owner.id,readonly.id); expect((await call(readonly.token,'secondlook_read_case')).status).toBe(401);
    users.revokeMember(c.id,owner.id,manager.id); expect((await call(gpKey.token,'secondlook_read_case')).status).toBe(401);
    const again = users.invite(c.id,owner.id,{role:'gp'});users.acceptInvite(again.token,manager.id,{});
    expect((await call(gpKey.token,'secondlook_read_case')).status).toBe(401);
    users.changePassword(owner.id,password,password+' changed'); expect((await call(work.token,'secondlook_read_case')).status).toBe(401);
    const expired = keys.issue(c.id,owner.id,'expired','read'); store.db.prepare('UPDATE agent_keys SET expires=0 WHERE id=?').run(expired.id);
    expect((await call(expired.token,'secondlook_read_case')).status).toBe(401);
    const rows = JSON.stringify(store.db.prepare('SELECT * FROM agent_keys').all());expect(rows).not.toContain(work.token);
    expect(store.read().revision).toBe(1);
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); store.close(); }
});
