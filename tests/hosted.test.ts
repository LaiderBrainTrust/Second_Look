import { expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { loadSavedDemo } from '../server/demo.js';
import capture from '../fixtures/demo-capture.json';
import type { SavedDemo } from '../server/demo.js';

it('keeps hosted data behind a case-scoped session and ignores forged role headers', async () => {
  const store = createStore(':memory:');
  const origin = 'https://demo.test'; const accessCode = 'test-only-access-code-with-32-characters';
  const server = createApp(store, { hosted: { origin, accessCode } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No address');
  const url = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  const request = (path: string, body?: unknown, extra: Record<string, string> = {}) => fetch(url + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    expect((await request('/api/case', undefined, { 'x-demo-role': 'lp' })).status).toBe(401);
    expect((await request('/api/providers')).status).toBe(401);
    expect((await request('/api/case/research')).status).toBe(401);
    expect((await request('/api/session/login', { code: accessCode }, { Origin: 'https://evil.test' })).status).toBe(403);
    expect((await request('/api/session/login', { code: 'wrong' })).status).toBe(401);
    const login = await request('/api/session/login', { code: accessCode });
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Strict');
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    expect((await (await request('/api/case')).json()).privateReview).toBeDefined();
    const command = { expectedRevision: 1, command: { kind: 'answer', text: 'Fictional answer', distributionCents: 10000000 } };
    expect((await request('/api/case/commands', command, { 'x-demo-role': 'gp' })).status).toBe(403);
    expect((await request('/api/session/role', { role: 'gp' }, { Origin: '' })).status).toBe(403);
    expect((await request('/api/session/role', { role: 'gp' })).status).toBe(200);
    expect((await request('/api/case/gaming')).status).toBe(403);
    expect((await (await request('/api/case', undefined, { 'x-demo-role': 'lp' })).json()).privateReview).toBeUndefined();
    expect((await request('/api/case/commands', command)).status).toBe(200);
    expect((await request('/api/case/commands', { expectedRevision: 2, command: { kind: 'revise_offer', purchasePriceCents: 73500000, priceAdjustmentCents: -50000, distributionRecipient: 'seller', sourceNote: 'Fictional revised offer' } })).status).toBe(403);
    await request('/api/session/role', { role: 'buyer' });
    const revised = await request('/api/case/commands', { expectedRevision: 2, command: { kind: 'revise_offer', purchasePriceCents: 73500000, priceAdjustmentCents: -50000, distributionRecipient: 'seller', sourceNote: 'Fictional revised offer' } });
    expect(revised.status).toBe(200);
    expect((await revised.json()).offer).toMatchObject({ purchasePriceCents: 73500000, priceAdjustmentCents: -50000 });
    await request('/api/session/role', { role: 'lp' });
    const question = await request('/api/case/commands', { expectedRevision: 3, command: { kind: 'set_question', text: 'Who receives the revised distribution?', sourceNote: 'Investor question' } });
    expect(question.status).toBe(200);
    expect(await question.json()).toMatchObject({ revision: 4, answer: null });
    expect((await request('/api/case/commands', { expectedRevision: 3, command: { kind: 'set_question', text: 'Stale question', sourceNote: 'Investor question' } })).status).toBe(409);
    await request('/api/session/logout', {});
    expect((await request('/api/case')).status).toBe(401);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});

it('loads only a matching saved sponsor review, preserves history, and keeps prior evidence after failure', () => {
  const store = createStore(':memory:');
  try {
    const wrong = structuredClone(capture) as SavedDemo;
    wrong.run.input!.offer.distributionRecipient = 'buyer';
    expect(() => loadSavedDemo(store, wrong)).toThrow('does not match');
    loadSavedDemo(store, capture as SavedDemo);
    const run = store.listResearch()[0];
    const state = store.publishResearch(run.id, 1);
    expect(state.researchContext?.game).toBe('Tiny Glade');
    expect(state.answer).toBeNull();
    expect(() => loadSavedDemo(store, capture as SavedDemo)).toThrow('Existing work is preserved');
    store.saveGaming({ id: 'failed-new-fetch', createdAt: '2099-01-01T00:00:00Z', caseRevision: 2, status: 'blocked', reportCutoff: '2026-09-30', holdings: [] });
    expect(store.latestGaming()?.id).toBe('failed-new-fetch');
    expect(store.latestUsableGaming()?.id).toBe(capture.snapshot.id);
    store.saveGaming({ id: 'empty-ready-fetch', createdAt: '2099-01-02T00:00:00Z', caseRevision: 2, status: 'ready', reportCutoff: '2026-09-30', holdings: [] });
    expect(store.latestUsableGaming()?.id).toBe(capture.snapshot.id);
  } finally { store.close(); }
});
