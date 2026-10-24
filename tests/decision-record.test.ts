import { expect, it } from 'vitest';
import { decisionRecord, decisionRecordHtml } from '../server/decision-record.js';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';

it('exports current economics and the historical approval without rewriting either or mutating the case', () => {
  const store = createStore(':memory:');
  try {
    store.command('gp', 1, { kind: 'answer', text: 'Fictional distribution confirmation.', distributionCents: 10_000_000 });
    store.command('lp', 2, { kind: 'approve' });
    store.command('buyer', 2, { kind: 'revise', distributionRecipient: 'buyer' });
    const before = store.read();
    const record = decisionRecord(store, 3);
    expect(record.case.privateReview).toMatchObject({ grossReceiptsCents: 70_000_000, status: 'terms_changed' });
    expect(record.approvals[0]).toMatchObject({ revision: 2, status: 'historical' });
    expect(record.approvals[0].responseText).toContain('$800,000');
    const html = decisionRecordHtml(record);
    expect(html).toContain('$700,000.00'); expect(html).toContain('-$100,000.00');
    expect(html).toContain('Does not approve the current version.');
    expect(html).toContain('Fictional distribution confirmation.');
    expect(store.read()).toEqual(before);
    expect(() => decisionRecord(store, 2)).toThrow('This case changed');
  } finally { store.close(); }
});

it('keeps unresolved money and missing historical fields explicit and escapes untrusted content', () => {
  const store = createStore(':memory:');
  try {
    const record = decisionRecord(store);
    record.case.question = '<script>alert(1)</script>';
    record.case.questionSource = { id: 'bad', kind: 'external', label: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' };
    record.approvals.push({ revision: 0, responseText: 'Old record', approvedAt: '2026-10-24T00:00:00Z', status: 'historical' });
    const html = decisionRecordHtml(record);
    expect(record.case.privateReview?.grossReceiptsCents).toBeNull();
    expect(html).toContain('Unresolved');
    expect(html).toContain('Not saved in this earlier record.');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('<img');
  } finally { store.close(); }
});

it('exports an unknown payout recipient as unconfirmed and keeps the total unresolved', () => {
  const store = createStore(':memory:');
  try {
    store.command('gp', 1, { kind: 'answer', text: 'Payout amount confirmed.', distributionCents: 10_000_000 });
    store.command('buyer', 2, { kind: 'revise', distributionRecipient: null });
    const record = decisionRecord(store);
    const html = decisionRecordHtml(record);
    expect(record.case.offer.distributionRecipient).toBeNull();
    expect(record.case.privateReview?.grossReceiptsCents).toBeNull();
    expect(html).toContain('Distribution recipient</th><td>Not confirmed');
    expect(html).toContain('Missing payout or sale terms');
    expect(html).not.toContain('Ready for investor review');
  } finally { store.close(); }
});

it('requires the investor session, validates export options and rejects a stale displayed revision', async () => {
  const store = createStore(':memory:');
  const origin = 'https://demo.test'; const code = 'test-code-with-at-least-32-characters';
  const server = createApp(store, { hosted: { origin, accessCode: code } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  const request = (path: string, body?: unknown) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', 'x-demo-role': 'lp' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    expect((await request('/api/case/decision-record')).status).toBe(401);
    const login = await request('/api/session/login', { code });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    const html = await request('/api/case/decision-record?revision=1');
    expect(html.status).toBe(200);
    expect(html.headers.get('content-disposition')).toBe('attachment; filename="second-look-decision-r1.html"');
    expect(html.headers.get('cache-control')).toBe('no-store');
    expect(html.headers.get('content-type')).toContain('text/html');
    const json = await request('/api/case/decision-record?format=json&revision=1');
    expect((await json.json()).case.revision).toBe(1);
    for (const query of ['format=pdf', 'revision=no', 'revision=0', 'format=json&format=html']) expect((await request('/api/case/decision-record?' + query)).status).toBe(400);
    await request('/api/session/role', { role: 'gp' });
    expect((await request('/api/case/decision-record')).status).toBe(403);
    await request('/api/case/commands', { expectedRevision: 1, command: { kind: 'answer', text: 'Fictional', distributionCents: 10_000_000 } });
    await request('/api/session/role', { role: 'buyer' });
    expect((await request('/api/case/decision-record?format=json')).status).toBe(403);
    await request('/api/session/role', { role: 'lp' });
    expect((await request('/api/case/decision-record?revision=1')).status).toBe(409);
    expect((await request('/api/case/decision-record?revision=2')).status).toBe(200);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});
