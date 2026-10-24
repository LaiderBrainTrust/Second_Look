import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { CaseState } from '../shared/contracts.js';
import type { ClosingCondition, ComparisonOffer, DiligenceCommand } from '../shared/diligence.js';
import { applyCommand, seedCase, view } from '../server/domain.js';
import { applyDiligence, compareOffers, diligenceView } from '../server/diligence.js';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
import { decisionRecord, decisionRecordHtml } from '../server/decision-record.js';

const now = new Date('2026-10-24T17:00:00Z');
const answered = () => applyCommand(seedCase(), 'gp', 1, { kind: 'answer', text: 'Fictional $100,000 distribution confirmation.', distributionCents: 10_000_000 });
const quote = (state: CaseState, extra: Partial<ComparisonOffer> = {}): Omit<ComparisonOffer, 'version'> => ({
  id: 'buyer-a', buyer: 'Buyer A (fictional)', purchasePriceCents: 70_000_000, priceAdjustmentCents: 0, sellerFeesCents: 500_000,
  distributionRecipient: 'seller', distributionBasisSourceId: state.answer?.source.id ?? null,
  recordDate: '2026-10-01', expiresAt: '2026-11-01T00:00:00Z', sourceNote: 'Fictional written offer, clause 3',
  conditions: 'Subject to consent', withdrawn: false, ...extra,
});
const saveOffer = (state: CaseState, extra: Partial<ComparisonOffer> = {}) => applyDiligence(state, 'lp', state.revision, { kind: 'save_offer', offer: quote(state, extra) }, now);
const addQuestion = (state: CaseState, owner: 'gp' | 'buyer' | 'lp' = 'gp', id = 'distribution') => applyDiligence(state, 'lp', state.revision, { kind: 'add_question', question: { id, question: 'Confirm the distribution entitlement in the agreement.', owner, dueAt: '2026-10-23T12:00:00Z' } }, now);
const condition: ClosingCondition = { id: 'consent', kind: 'gp_consent', title: 'Written manager consent', owner: 'Fund manager', dueAt: '2026-10-23T12:00:00Z', required: true, status: 'pending', evidenceNote: null };

it('reveals when the higher headline offer pays less after distributions and fees, retaining exact cents', () => {
  let s = saveOffer(answered(), { purchasePriceCents: 70_000_001 });
  s = saveOffer(s, { id: 'buyer-b', buyer: 'Buyer B', purchasePriceCents: 75_000_000, distributionRecipient: 'buyer', sellerFeesCents: 2_500_000 });
  const c = compareOffers(s, now);
  expect(c.comparisonReady).toBe(true);
  expect(c.highestHeadlineOfferIds).toEqual(['buyer-b']);
  expect(c.highestNetOfferIds).toEqual(['buyer-a']);
  expect(c.offers.map(o => o.netBeforeTaxCents)).toEqual([79_500_001, 72_500_000]);
  expect(s.offer.purchasePriceCents).toBe(70_000_000); // Alternatives never silently replace the reviewed deal.
});

it('keeps unknown fees, dates and distribution basis unresolved, with no partial winner', () => {
  let s = saveOffer(answered());
  s = saveOffer(s, { id: 'buyer-b', sellerFeesCents: null, recordDate: null, distributionBasisSourceId: null });
  let c = compareOffers(s, now);
  expect(c.offers[1].netBeforeTaxCents).toBeNull(); expect(c.highestNetOfferIds).toEqual([]);
  expect(c.offers[1].missing).toContain('Seller fees');
  s = saveOffer(s, { id: 'buyer-b', recordDate: '2026-10-02' });
  c = compareOffers(s, now);
  expect(c.comparisonReady).toBe(false); expect(c.reasons.join(' ')).toContain('Record dates differ');
  s = saveOffer(s, { id: 'buyer-b', expiresAt: '2026-10-24T17:00:00Z' });
  expect(compareOffers(s, now).highestNetOfferIds).toEqual([]);
  expect(compareOffers(s, now).offers.find(o => o.id === 'buyer-b')?.expired).toBe(true);
});

it('invalidates stale distribution assumptions after a manager answer changes and allows signed explicit adjustments', () => {
  let s = saveOffer(answered(), { priceAdjustmentCents: -1_000_000 });
  expect(compareOffers(s, now).offers[0].netBeforeTaxCents).toBe(78_500_000);
  s = applyCommand(s, 'gp', s.revision, { kind: 'answer', text: 'Revised distribution', distributionCents: 12_000_000 });
  expect(compareOffers(s, now).offers[0].netBeforeTaxCents).toBeNull();
  expect(() => saveOffer(s, { distributionBasisSourceId: 'fictional-answer-2' })).toThrow('current manager answer');
  s = saveOffer(s, { priceAdjustmentCents: -1_000_000 });
  expect(compareOffers(s, now).offers[0].netBeforeTaxCents).toBe(80_500_000);
  expect(s.diligence?.history[0].item).toMatchObject({ version: 1, distributionBasisSourceId: 'fictional-answer-2' });
});

it('requires the assigned answer and investor resolution, and retains historical answers after reopening', () => {
  let s = addQuestion(answered());
  expect(diligenceView(s, 'gp', now).questions[0].overdue).toBe(true);
  expect(() => applyDiligence(s, 'buyer', s.revision, { kind: 'answer_question', id: 'distribution', text: 'Wrong participant' }, now)).toThrow('not found');
  expect(() => applyDiligence(s, 'lp', s.revision, { kind: 'resolve_question', id: 'distribution', note: 'Done' }, now)).toThrow('Obtain an answer');
  s = applyDiligence(s, 'gp', s.revision, { kind: 'answer_question', id: 'distribution', text: 'See clause 3.' }, now);
  expect(() => applyCommand(s, 'lp', s.revision, { kind: 'approve' })).toThrow('Resolve tracked questions');
  expect(() => applyDiligence(s, 'gp', s.revision, { kind: 'resolve_question', id: 'distribution', note: 'Done' }, now)).toThrow('Only the investor');
  s = applyDiligence(s, 'lp', s.revision, { kind: 'resolve_question', id: 'distribution', note: 'Clause 3 reviewed.' }, now);
  s = applyCommand(s, 'lp', s.revision, { kind: 'approve' });
  const approvedRevision = s.revision;
  s = applyDiligence(s, 'lp', s.revision, { kind: 'reopen_question', id: 'distribution', note: 'New terms need confirmation.' }, now);
  expect(s.diligence?.questions[0]).toMatchObject({ status: 'open', answer: null });
  expect(s.reviews[0].revision).toBe(approvedRevision);
  expect(s.reviews[0].diligence?.questions[0]).toMatchObject({ status: 'resolved', answer: { text: 'See clause 3.' } });
  expect(view(s, 'lp').privateReview?.status).toBe('terms_changed');
  expect(s.diligence?.history.find(e => e.kind === 'answer_question')?.item).toMatchObject({ answer: { text: 'See clause 3.' } });
});

it('tracks consent/ROFR deadlines without treating expiry as consent and demands supporting evidence', () => {
  let s = applyDiligence(answered(), 'lp', 2, { kind: 'save_condition', condition }, now);
  expect(diligenceView(s, 'lp', now).privateDiligence?.conditions[0]).toMatchObject({ overdue: true, status: 'pending' });
  expect(() => applyCommand(s, 'lp', s.revision, { kind: 'approve' })).toThrow('required closing conditions');
  expect(() => applyDiligence(s, 'lp', s.revision, { kind: 'save_condition', condition: { ...condition, status: 'satisfied' } }, now)).toThrow('supporting evidence');
  s = applyDiligence(s, 'lp', s.revision, { kind: 'save_condition', condition: { ...condition, status: 'satisfied', evidenceNote: 'Fictional signed consent, page 2.' } }, now);
  s = applyCommand(s, 'lp', s.revision, { kind: 'approve' });
  expect(view(s, 'lp').privateReview?.status).toBe('approved');
  s = applyDiligence(s, 'lp', s.revision, { kind: 'save_condition', condition: { ...condition, kind: 'right_of_first_refusal', status: 'pending' } }, now);
  expect(view(s, 'lp').privateReview?.status).toBe('terms_changed');
  expect(s.reviews[0].diligence?.conditions[0].status).toBe('satisfied');
});

it('withholds competing offers, private conditions and unrelated questions from counterparties', () => {
  let s = saveOffer(answered()); s = addQuestion(s); s = addQuestion(s, 'buyer', 'buyer-term');
  s = applyDiligence(s, 'lp', s.revision, { kind: 'save_condition', condition }, now);
  const gp = diligenceView(s, 'gp', now);
  expect(gp.questions.map(q => q.id)).toEqual(['distribution']);
  expect(gp.privateDiligence).toBeUndefined();
  expect(JSON.stringify(gp)).not.toContain('Buyer A'); expect(JSON.stringify(gp)).not.toContain('Written manager consent');
  expect(diligenceView(s, 'buyer', now).questions.map(q => q.id)).toEqual(['buyer-term']);
  expect(view(s, 'gp').privateReview).toBeUndefined();
});

it('rejects invalid values, calendar dates, flags, overflow, and stale edits without mutating input', () => {
  const s = answered(); const copy = structuredClone(s);
  for (const extra of [
    { sellerFeesCents: -1 }, { purchasePriceCents: 0.5 }, { purchasePriceCents: Number.MAX_SAFE_INTEGER },
    { recordDate: '2026-02-30' }, { expiresAt: '2026-02-30T12:00:00Z' },
    { expiresAt: '2026-10-24' }, { withdrawn: 'false' }, { sourceNote: '' },
    { id: '../oops' }, { distributionRecipient: 'manager' }, { sellerFeesCents: undefined },
  ]) expect(() => saveOffer(s, extra as Partial<ComparisonOffer>)).toThrow();
  expect(() => applyDiligence(s, 'lp', 1, { kind: 'save_offer', offer: quote(s) }, now)).toThrow('case changed');
  expect(() => applyDiligence(s, 'lp', 2, { kind: 'oops' } as unknown as DiligenceCommand, now)).toThrow('Invalid diligence');
  expect(s).toEqual(copy);
});

it('persists state and item history across restart, and rolls back a failed transaction', () => {
  const dir = mkdtempSync(join(tmpdir(), 'second-look-diligence-')); const path = join(dir, 'state.sqlite');
  let store = createStore(path);
  try {
    store.command('gp', 1, { kind: 'answer', text: 'Distribution', distributionCents: 10_000_000 });
    store.diligenceCommand('lp', 2, { kind: 'save_offer', offer: quote(store.read()) });
    const saved = store.read();
    expect(() => store.diligenceCommand('lp', 3, { kind: 'save_offer', offer: quote(saved, { sellerFeesCents: -1 }) })).toThrow();
    expect(store.read()).toEqual(saved);
    store.close(); store = createStore(path); expect(store.read()).toEqual(saved);
    store.diligenceCommand('lp', 3, { kind: 'save_offer', offer: quote(saved, { sellerFeesCents: 1_000_000 }) });
    expect(store.read().diligence?.history).toHaveLength(2);
    expect(store.read().diligence?.history[0].item).toMatchObject({ sellerFeesCents: 500_000 });
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});

it('exports the complete comparison and question record with safe escaping and no private-role leakage', () => {
  const store = createStore(':memory:');
  try {
    store.command('gp', 1, { kind: 'answer', text: 'Distribution', distributionCents: 10_000_000 });
    store.diligenceCommand('lp', 2, { kind: 'save_offer', offer: quote(store.read(), { buyer: '<script>bad</script>' }) });
    const record = decisionRecord(store);
    expect(record.diligence?.privateDiligence?.comparison.offers[0].netBeforeTaxCents).toBe(79_500_000);
    const html = decisionRecordHtml(record);
    expect(html).toContain('$795,000.00'); expect(html).toContain('&lt;script&gt;bad&lt;/script&gt;'); expect(html).not.toContain('<script>');
  } finally { store.close(); }
});

it('enforces hosted authentication, origin, role projection and revision checks on the new HTTP routes', async () => {
  const store = createStore(':memory:');
  const origin = 'https://demo.test'; const code = 'test-code-with-at-least-32-characters';
  const server = createApp(store, { hosted: { origin, accessCode: code } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  let cookie = '';
  const request = (path: string, body?: unknown, headers = {}) => fetch(`http://127.0.0.1:${address.port}` + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    expect((await request('/api/case/diligence')).status).toBe(401);
    const login = await request('/api/session/login', { code }); cookie = login.headers.get('set-cookie')!.split(';')[0];
    const cmd = { expectedRevision: 1, command: { kind: 'add_question', question: { id: 'q1', question: 'Confirm clause 3', owner: 'gp', dueAt: null } } };
    expect((await request('/api/case/diligence/commands', cmd, { Origin: 'https://evil.test' })).status).toBe(403);
    expect((await request('/api/case/diligence/commands', cmd)).status).toBe(200);
    expect((await request('/api/case/diligence/commands', cmd)).status).toBe(409);
    await request('/api/session/role', { role: 'gp' });
    const gp = await (await request('/api/case/diligence')).json(); expect(gp.privateDiligence).toBeUndefined(); expect(gp.questions).toHaveLength(1);
    expect((await request('/api/case/diligence/commands', { ...cmd, expectedRevision: 2 }, { 'x-demo-role': 'lp' })).status).toBe(403);
    expect((await request('/api/case/diligence/commands', { expectedRevision: 2, command: { kind: 'answer_question', id: 'q1', text: 'Confirmed, clause 3' } })).status).toBe(200);
    await request('/api/session/role', { role: 'buyer' });
    expect((await (await request('/api/case/diligence')).json()).questions).toEqual([]);
    expect((await request('/api/case/diligence/commands', { expectedRevision: 3, command: { kind: 'answer_question', id: 'q1', text: 'Guess' } })).status).toBe(404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});
