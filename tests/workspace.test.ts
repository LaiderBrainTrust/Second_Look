import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createStore } from '../server/store.js';
import { createWorkspaceAccess } from '../server/workspace-access.js';
import { createApp } from '../server/app.js';
import { createReviewRecovery } from '../server/review-recovery.js';
import type { ResearchRun } from '../shared/research.js';

const origin = 'https://workspace.test';
const accessCode = 'test-only-registration-code-of-sufficient-length';
const pw = 'A test-only long passphrase 2026!';
const input = () => ({ requestId: randomUUID(), title: 'User-entered fund', ownerEntity: 'Entered owner', reportNote: 'User supplied report reference p. 4', offerNote: 'Written quote, p. 2', purchasePriceCents: 70_000_001, priceAdjustmentCents: 0, distributionRecipient: 'seller', question: 'Confirm the distribution.', allowExternalResearch: false });
async function serverFor(store: ReturnType<typeof createStore>) {
  const server = createApp(store, { hosted: { origin, accessCode } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  return { base: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}
function client(base: string, initialCookie = '') {
  let cookie = initialCookie;
  return {
    cookie: () => cookie,
    async request(path: string, body?: unknown, headers: Record<string, string> = {}) {
      const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const next = res.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
      return { status: res.status, data: await res.json(), headers: res.headers };
    },
  };
}

it('runs an entered case with distinct accounts, one-time invitations, fixed roles and attributed approvals', async () => {
  const store = createStore(':memory:'); const server = await serverFor(store);
  const lp = client(server.base), gp = client(server.base), buyer = client(server.base), stranger = client(server.base);
  try {
    expect((await lp.request('/api/accounts', { handle: 'owner', displayName: 'Owner', password: pw, registrationCode: 'bad' })).status).toBe(403);
    const registration = await lp.request('/api/accounts', { handle: 'owner', displayName: 'Owner', password: pw, registrationCode: accessCode });
    expect(registration.status).toBe(201); expect(registration.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Strict');
    expect((await lp.request('/api/session/role', { role: 'gp' })).status).toBe(403);
    const payload = input(); const created = await lp.request('/api/cases', payload); const id = created.data.id; const path = `/api/cases/${id}`;
    expect(created.status).toBe(201); expect(created.data.mode).toBe('user'); expect(created.data.title).toBe(payload.title);
    expect(created.data.offer.source.kind).toBe('user'); expect(created.data.answer).toBeNull();
    expect(JSON.stringify(created.data)).not.toContain('fictional'); expect(created.data.privateReview.allowExternalResearch).toBe(false);
    expect((await lp.request('/api/cases', payload)).data.id).toBe(id);
    expect((await lp.request('/api/cases', { ...payload, title: 'Changed payload' })).status).toBe(409);
    expect((await lp.request('/api/cases')).data.cases).toHaveLength(1);
    expect((await lp.request('/api/case')).status).toBe(401); // account cannot enter presenter paths
    expect((await stranger.request(path)).status).toBe(401);
    await stranger.request('/api/accounts', { handle: 'stranger', displayName: 'Unrelated investor', password: pw, registrationCode: accessCode });
    expect((await stranger.request(path)).status).toBe(404);
    expect((await stranger.request('/api/cases')).data.cases).toEqual([]);
    const inviteGp = await lp.request(path + '/invitations', { role: 'gp', recipientHandle: 'manager' });
    expect(inviteGp.status).toBe(201); expect(inviteGp.data.acceptanceUrl).toContain('/#invite=');
    const joinGp = await gp.request('/api/invitations/accept', { token: inviteGp.data.token, handle: 'manager', displayName: 'Manager', password: pw });
    expect(joinGp.status).toBe(200);
    expect((await gp.request('/api/cases')).data.cases[0].role).toBe('gp');
    expect((await gp.request('/api/session/role', { role: 'lp' })).status).toBe(403);
    expect((await gp.request(path, undefined, { 'x-demo-role': 'lp' })).data.privateReview).toBeUndefined();
    expect((await gp.request(path + '/decision-record?format=json')).status).toBe(403);
    expect((await gp.request(path + '/invitations', { role: 'buyer' })).status).toBe(404);
    expect((await buyer.request('/api/invitations/accept', { token: inviteGp.data.token, handle: 'buyer', displayName: 'Buyer', password: pw })).status).toBe(410);
    const inviteBuyer = await lp.request(path + '/invitations', { role: 'buyer' });
    expect((await buyer.request('/api/invitations/accept', { token: inviteBuyer.data.token, handle: 'buyer', displayName: 'Buyer', password: pw })).status).toBe(200);
    const answer = await gp.request(path + '/commands', { expectedRevision: 1, command: { kind: 'answer', text: 'Confirmed from distribution notice, page 1.', distributionCents: 10_000_003 } });
    expect(answer.status).toBe(200); expect(answer.data.answer.source.kind).toBe('user');
    expect((await buyer.request(path + '/commands', { expectedRevision: 2, command: { kind: 'approve' } })).status).toBe(403);
    const approved = await lp.request(path + '/commands', { expectedRevision: 2, command: { kind: 'approve' } });
    expect(approved.data.privateReview.grossReceiptsCents).toBe(80_000_004);
    expect(approved.data.privateReview.responseText).toContain('$800,000.04');
    expect(approved.data.privateReview.reviews[0].actor.userId).toBe(registration.data.user.id);
    const revise = await buyer.request(path + '/commands', { expectedRevision: 2, command: { kind: 'revise_offer', purchasePriceCents: 75_000_000, priceAdjustmentCents: -100_000, distributionRecipient: 'buyer', sourceNote: 'Buyer revised terms, clause 2' } });
    expect(revise.status).toBe(200);
    const current = await lp.request(path);
    expect(current.data.privateReview.status).toBe('terms_changed'); expect(current.data.privateReview.grossReceiptsCents).toBe(74_900_000);
    expect(current.data.privateReview.events.at(-1).actor.role).toBe('buyer');
    const exported = await lp.request(path + '/decision-record?format=json');
    expect(exported.data.disclosure).not.toContain('roles are simulated'); expect(exported.data.disclosure).toContain('self-declared');
    const members = await lp.request(path + '/members');
    expect(members.data.members).toHaveLength(3); expect(members.data.events.some((e: { kind: string }) => e.kind === 'invitation_accepted')).toBe(true);
    expect(JSON.stringify(members.data)).not.toContain(inviteGp.data.token);
    expect((await lp.request(path + `/members/${joinGp.data.user.id}/revoke`, {})).status).toBe(200);
    expect((await gp.request(path)).status).toBe(404); // existing cookie loses access immediately
    expect((await gp.request(path + '/commands', { expectedRevision: 3, command: { kind: 'answer', text: 'No access', distributionCents: 1 } })).status).toBe(404);
    expect(store.read().revision).toBe(1); expect(store.read().answer).toBeNull();
  } finally { await server.close(); store.close(); }
});

it('persists account sessions and memberships across process restart and stores no plaintext credentials', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'workspace-test-')); const path = join(dir, 'state.sqlite');
  let store = createStore(path); let server = await serverFor(store); let user = client(server.base);
  try {
    await user.request('/api/accounts', { handle: 'durable-owner', displayName: 'Durable Owner', password: pw, registrationCode: accessCode });
    const created = await user.request('/api/cases', input()); const id = created.data.id;
    const invite = await user.request(`/api/cases/${id}/invitations`, { role: 'gp' }); const cookie = user.cookie();
    const rows = JSON.stringify([store.db.prepare('SELECT * FROM workspace_users').all(), store.db.prepare('SELECT * FROM workspace_sessions').all(), store.db.prepare('SELECT * FROM workspace_invites').all()]);
    expect(rows).not.toContain(pw); expect(rows).not.toContain(invite.data.token); expect(rows).not.toContain(cookie.split('=')[1]);
    await server.close(); store.close(); store = createStore(path); server = await serverFor(store); user = client(server.base, cookie);
    expect((await user.request(`/api/cases/${id}`)).status).toBe(200);
    expect((await user.request('/api/session')).data.user.handle).toBe('durable-owner');
    const fresh = client(server.base);
    expect((await fresh.request('/api/session/login', { handle: 'durable-owner', password: 'incorrect' })).status).toBe(401);
    expect((await fresh.request('/api/session/login', { handle: 'DURABLE-OWNER', password: pw })).status).toBe(200);
    await user.request('/api/session/logout', {});
    expect((await client(server.base, cookie).request(`/api/cases/${id}`)).status).toBe(401);
  } finally { await server.close(); store.close(); rmSync(dir, { recursive: true }); }
});

it('rejects expired, revoked, wrong-recipient and privilege-escalating invitations without orphan accounts', () => {
  const store = createStore(':memory:'); const access = createWorkspaceAccess(store.db);
  try {
    const owner = access.register({ handle: 'owner', displayName: 'Owner', password: pw }); const c = access.createCase(owner.id, input());
    expect(() => access.invite(c.id, owner.id, { role: 'lp' })).toThrow('Invite a fund manager or buyer');
    const invitation = access.invite(c.id, owner.id, { role: 'gp', recipientHandle: 'intended' });
    expect(() => access.acceptInvite(invitation.token, undefined, { handle: 'wrong', displayName: 'Wrong', password: pw })).toThrow('different account');
    expect(store.db.prepare('SELECT id FROM workspace_users WHERE handle=?').get('wrong')).toBeUndefined();
    access.revokeInvite(c.id, owner.id, invitation.id);
    expect(() => access.acceptInvite(invitation.token, undefined, { handle: 'intended', displayName: 'Intended', password: pw })).toThrow('expired, revoked');
    const expired = access.invite(c.id, owner.id, { role: 'buyer' });
    store.db.prepare('UPDATE workspace_invites SET expires=0 WHERE id=?').run(expired.id);
    expect(() => access.acceptInvite(expired.token, undefined, { handle: 'expired', displayName: 'Expired', password: pw })).toThrow('expired, revoked');
    expect(store.db.prepare('SELECT id FROM workspace_users WHERE handle=?').get('expired')).toBeUndefined();
    const same = access.invite(c.id, owner.id, { role: 'gp' });
    expect(() => access.acceptInvite(same.token, owner.id, {})).toThrow('already participates');
    expect(access.membership(c.id, owner.id).role).toBe('lp');
    expect(() => access.revokeMember(c.id, owner.id, owner.id)).toThrow('cannot revoke');
  } finally { store.close(); }
});

it('isolates case research and exports while process recovery can reconcile all authorized case tasks', async () => {
  const store = createStore(':memory:'); const access = createWorkspaceAccess(store.db);
  try {
    const owner = access.register({ handle: 'owner', displayName: 'Owner', password: pw });
    const a = access.createCase(owner.id, input()); const b = access.createCase(owner.id, input());
    const run = (caseId: string): ResearchRun => ({ id: randomUUID(), caseId, caseRevision: 1, company: { uuid: '001', name: 'Company', website: '' }, after: '2026-01-01', createdAt: new Date().toISOString(), findings: [], status: 'queued', taskId: randomUUID(), writeRequestId: randomUUID(), dispatchRequestId: randomUUID() });
    const ra = run(a.id); const rb = run(b.id); const sa = store.forCase(a.id); const sb = store.forCase(b.id);
    sa.saveResearch(ra); sb.saveResearch(rb);
    expect(sa.listResearch().map(r => r.id)).toEqual([ra.id]); expect(store.listResearch()).toEqual([]);
    expect(() => sa.research(rb.id)).toThrow('not found'); expect(() => sa.saveResearch(rb)).toThrow('different case');
    expect(() => sa.saveResearch({ ...ra, id: rb.id })).toThrow('different case');
    expect(() => sa.publishResearch(rb.id, 1)).toThrow('not found');
    expect(sa.latestGaming()).toBeNull(); expect(() => sa.gaming('sample')).toThrow('not found');
    const recovery = createReviewRecovery(store.recoveryStore, { result: async () => ({ status: 'blocked' as const, error: 'Controlled test result' }) });
    await recovery.tick(); expect(sa.research(ra.id).status).toBe('blocked'); expect(sb.research(rb.id).status).toBe('blocked'); recovery.close();
  } finally { store.close(); }
});

it('requires explicit case-owner consent before outbound research, keeps scope checks before provider calls', async () => {
  const store = createStore(':memory:'); const server = await serverFor(store); const lp = client(server.base); const gp = client(server.base);
  try {
    await lp.request('/api/accounts', { handle: 'owner', displayName: 'Owner', password: pw, registrationCode: accessCode });
    const a = (await lp.request('/api/cases', input())).data; const b = (await lp.request('/api/cases', input())).data;
    const path = `/api/cases/${a.id}`;
    expect((await lp.request(path + '/research', { expectedRevision: 1, companyId: '001', after: '2026-01-01' })).status).toBe(403);
    expect((await lp.request('/api/research/search', { query: 'something' })).status).toBe(403);
    const consent = await lp.request(path + '/external-research', { expectedRevision: 1, enabled: true });
    expect(consent.data.privateReview.allowExternalResearch).toBe(true);
    expect((await lp.request(path + '/external-research', { expectedRevision: 1, enabled: false })).status).toBe(409);
    const fake: ResearchRun = { id: randomUUID(), caseId: b.id, caseRevision: 1, company: { uuid: '001', name: 'Company', website: '' }, after: '2026-01-01', createdAt: new Date().toISOString(), findings: [], status: 'queued', taskId: randomUUID(), writeRequestId: randomUUID(), dispatchRequestId: randomUUID() };
    store.forCase(b.id).saveResearch(fake);
    expect((await lp.request(path + `/research/${fake.id}/check`, {})).status).toBe(404);
    const invite = await lp.request(path + '/invitations', { role: 'gp' });
    await gp.request('/api/invitations/accept', { token: invite.data.token, handle: 'manager', displayName: 'Manager', password: pw });
    expect((await gp.request(path + '/external-research', { expectedRevision: 2, enabled: false })).status).toBe(404);
    expect((await gp.request(path + '/research')).status).toBe(403);
    expect((await lp.request(path + '/commands', { expectedRevision: 2, command: { kind: 'set_question', text: 'Updated question', sourceNote: 'Report p. 4' } }, { Origin: 'https://evil.test' })).status).toBe(403);
  } finally { await server.close(); store.close(); }
});

it('changes passwords only with the current password and revokes existing sessions', () => {
  const store = createStore(':memory:'); const access = createWorkspaceAccess(store.db);
  try {
    const user = access.register({ handle: 'owner', displayName: 'Owner', password: pw });
    const first = access.startSession(user.id); const second = access.startSession(user.id);
    expect(() => access.changePassword(user.id, 'wrong', 'New sufficiently long passphrase')).toThrow('did not match');
    expect(access.session(first)).toBeDefined();
    access.changePassword(user.id, pw, 'New sufficiently long passphrase');
    expect(access.session(first)).toBeUndefined(); expect(access.session(second)).toBeUndefined();
    expect(() => access.authenticate({ handle: 'owner', password: pw })).toThrow('did not match');
    expect(access.authenticate({ handle: 'owner', password: 'New sufficiently long passphrase' }).id).toBe(user.id);
  } finally { store.close(); }
});
