import { Router } from 'express';
import type { SourceRef } from '../shared/contracts.js';
import { DomainError, view } from './domain.js';
import type { createStore } from './store.js';
import { diligenceView } from './diligence.js';
import type { DiligenceView } from '../shared/diligence.js';

export function decisionRecord(store: ReturnType<typeof createStore>, revision?: number) {
  const state = revision === undefined ? store.read() : store.current(revision);
  const current = view(state, 'lp');
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    title: 'Second Look decision record',
    disclosure: 'Illustrative fund and deal. Participant roles are simulated; identities are not independently verified. An approval records an app review, not a signature, accepted sale or money movement.',
    assumptions: 'Gross receipts use the stated purchase payment, price adjustment and distribution recipient. Taxes, fees and timing are excluded. Game popularity does not establish distributions or fund value.',
    case: current,
    ...(state.diligence ? { diligence: diligenceView(state, 'lp') } : {}),
    approvals: state.reviews.map(review => ({ ...review, status: review.revision === state.revision ? 'current' : 'historical' })),
    historyLimit: 'Earlier approvals contain only the information saved at the time. Missing historical fields are not reconstructed from current terms. This export is a snapshot, not a live status page.',
  };
}
type Record = ReturnType<typeof decisionRecord>;
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (cents: number | null | undefined) => cents == null ? 'Unresolved' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cents / 100);
const paragraph = (text: string) => `<p class="text">${escape(text)}</p>`;
function source(ref?: SourceRef) {
  if (!ref) return '<p class="muted">Source not saved.</p>';
  let url: URL | undefined;
  try { const parsed = new URL(ref.url ?? ''); if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) url = parsed; } catch { /* no link */ }
  return `<p class="source">Source: ${url ? `<a href="${escape(url.href)}" rel="noopener noreferrer">${escape(ref.label)}</a>` : escape(ref.label)} · ${escape(ref.kind)}${ref.locator ? ` · ${escape(ref.locator)}` : ''}${ref.revision ? ` · version ${escape(ref.revision)}` : ''}</p>`;
}
function diligenceHtml(d: DiligenceView) {
  const p = d.privateDiligence!;
  const roles = { lp: 'Investor', gp: 'Fund manager', buyer: 'Buyer' };
  return `<h2>Competing offers and outstanding work</h2>${paragraph(p.comparison.assumptions)}
${p.comparison.reasons.map(paragraph).join('')}
${p.comparison.offers.length ? `<table><thead><tr><th>Buyer / version</th><th>Purchase payment</th><th>Seller fees</th><th>Cash before tax</th><th>Terms / status</th></tr></thead><tbody>${p.comparison.offers.map(o => `<tr><td>${escape(o.buyer)} / ${o.version}</td><td>${money(o.purchasePriceCents)}</td><td>${money(o.sellerFeesCents)}</td><td>${money(o.netBeforeTaxCents)}${p.comparison.highestNetOfferIds.includes(o.id) ? ' · Highest comparable amount' : ''}</td><td>${escape(o.withdrawn ? 'Withdrawn' : o.expired ? 'Expired' : 'Active')}<br>Record date: ${escape(o.recordDate ?? 'Unknown')}<br>Recipient: ${escape(o.distributionRecipient ?? 'Unknown')}<br>${escape(o.missing.join('; '))}<br>${escape(o.conditions)}<br>Source: ${escape(o.sourceNote)}</td></tr>`).join('')}</tbody></table>` : '<p>No comparison offers recorded.</p>'}
<h3>Questions</h3>${d.questions.map(q => `<article><h4>${escape(q.question)}</h4><p>Assigned to ${roles[q.owner]} · ${escape(q.status)}${q.overdue ? ' · Overdue' : ''} · Due ${escape(q.dueAt ?? 'Not set')}</p>${paragraph(q.answer?.text ?? 'Awaiting answer')}${q.resolution ? paragraph(q.resolution) : ''}</article>`).join('') || '<p>No additional questions recorded.</p>'}
<h3>Closing conditions</h3>${p.conditions.map(c => `<article><h4>${escape(c.title)}</h4><p>${escape(c.owner)} · ${escape(c.status)}${c.required ? ' · Required for review' : ''}${c.overdue ? ' · Overdue' : ''} · Due ${escape(c.dueAt ?? 'Not set')}</p>${paragraph(c.evidenceNote ?? 'Supporting evidence not yet recorded.')}</article>`).join('') || '<p>No closing conditions recorded. This does not establish that none apply.</p>'}
${p.blockers.length ? `<h3>Before approving</h3><ul>${p.blockers.map(b => `<li>${escape(b)}</li>`).join('')}</ul>` : ''}
<p class="muted">These are participant-recorded terms and assertions. No legal consent, waiver, signature, external notification or transfer is created by this record. The JSON export preserves every saved item revision.</p>`;
}
export function decisionRecordHtml(record: Record) {
  const c = record.case; const review = c.privateReview!;
  const statuses = { awaiting_answer: 'Waiting for the manager’s answer', needs_review: 'Ready for investor review', approved: 'Approved for this version', terms_changed: 'Changed since the previous approval — review required' };
  const change = review.lastTermChange;
  const delta = change?.previousGrossReceiptsCents != null && change.revisedGrossReceiptsCents != null ? change.revisedGrossReceiptsCents - change.previousGrossReceiptsCents : null;
  const approvals = record.approvals.map(a => `<article><h3>${a.status === 'current' ? 'Current' : 'Historical'} approval · revision ${a.revision}</h3><p>${escape(a.approvedAt)} · Investor role (simulated)</p>${a.status === 'historical' ? '<p><strong>Does not approve the current version.</strong></p>' : ''}${paragraph(a.responseText)}${a.researchContext ? paragraph(`Game: ${a.researchContext.game} · Studio: ${a.researchContext.studio}`) : ''}<h4>Question reviewed</h4>${paragraph(a.question ?? 'Not saved in this earlier record.')}<h4>Answer reviewed</h4>${paragraph(a.answer?.text ?? 'Not saved in this earlier record.')}${a.answer ? `<p>Distribution recorded: ${money(a.answer.distributionCents)}</p>${source(a.answer.source)}` : ''}</article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Second Look · ${escape(c.title)} · revision ${c.revision}</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#19232d;background:white;max-width:850px;margin:40px auto;padding:0 24px}h1{font-size:32px;line-height:1.2}h2{margin-top:32px;border-bottom:1px solid #d3d9de;padding-bottom:8px}h3{margin-bottom:0}h4{margin-bottom:4px}p{margin:8px 0}.text{white-space:pre-wrap;overflow-wrap:anywhere}.muted,.source{color:#485763;font-size:14px;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{text-align:left;border-bottom:1px solid #d3d9de;padding:10px;vertical-align:top}td{font-variant-numeric:tabular-nums}article{border:1px solid #d3d9de;padding:16px;margin:16px 0;break-inside:avoid}.status{font-weight:700;padding:12px;background:#eef2f5}a{color:#174d7a}@media print{body{margin:0;max-width:none;padding:0;font-size:11pt}h2,h3,h4{break-after:avoid}a{color:inherit}}</style></head><body>
<header><p>SECOND LOOK · DECISION RECORD</p><h1>${escape(c.title)}</h1><p>Case revision ${c.revision} · Offer version ${c.offer.version}</p><p class="muted">Exported ${escape(record.exportedAt)} · Timestamps preserved as recorded</p></header>
<p class="status">${review.diligenceBlockers?.length ? 'Outstanding questions or closing conditions require resolution before approval' : statuses[review.status]}</p>${paragraph(record.disclosure)}
<h2>Current deal</h2><p>Owner: ${escape(review.ownerEntity)}</p><table><tbody><tr><th scope="row">Purchase payment</th><td>${money(c.offer.purchasePriceCents)}</td></tr><tr><th scope="row">Price adjustment</th><td>${money(c.offer.priceAdjustmentCents)}</td></tr><tr><th scope="row">Distribution reported by manager</th><td>${money(c.answer?.distributionCents)}</td></tr><tr><th scope="row">Distribution recipient</th><td>${escape(c.offer.distributionRecipient)}</td></tr><tr><th scope="row">Scenario gross receipts to seller</th><td><strong>${money(review.grossReceiptsCents)}</strong></td></tr></tbody></table>${paragraph(record.assumptions)}${source(c.offer.source)}${source(review.report)}
<h2>Question and supporting answer</h2>${c.researchContext ? paragraph(`Selected game: ${c.researchContext.game} · Studio: ${c.researchContext.studio} · Shared at revision ${c.researchContext.sharedAtRevision}`) : ''}<h3>Question</h3>${paragraph(c.question)}${source(c.questionSource)}<h3>Manager’s answer</h3>${paragraph(c.answer?.text ?? 'No answer recorded. The distribution remains unresolved.')}${c.answer ? source(c.answer.source) : ''}
${change ? `<h2>Last recorded offer change</h2><p>At case revision ${change.atRevision}. These amounts describe that change, not any later change to the manager’s answer.</p><p>Prior purchase payment: ${money(change.previousOffer.purchasePriceCents)} · Prior distribution recipient: ${escape(change.previousOffer.distributionRecipient)}</p><p>Gross receipts at that change: ${money(change.previousGrossReceiptsCents)} → ${money(change.revisedGrossReceiptsCents)}</p><p><strong>Difference at that change: ${money(delta)}</strong></p>${source(change.previousOffer.source)}` : ''}
${record.diligence ? diligenceHtml(record.diligence) : ''}
<h2>Approval history</h2>${approvals || '<p>No approval has been recorded.</p>'}
<h2>Recorded changes</h2>${review.events.length ? `<ol>${review.events.map(e => `<li>${escape(e.at)} · revision ${e.revision}: ${escape(e.text)}</li>`).join('')}</ol>` : '<p>No changes recorded.</p>'}<footer>${paragraph(record.historyLimit)}</footer></body></html>`;
}

export function decisionRecordRouter(store: ReturnType<typeof createStore>) {
  const router = Router();
  router.get('/', (req, res, next) => {
    try {
      if (res.locals.role !== 'lp') throw new DomainError(403, 'Only the investor can export the private decision record.');
      const format = req.query.format ?? 'html';
      if (format !== 'html' && format !== 'json') throw new DomainError(400, 'Choose html or json for the decision record.');
      const revision = req.query.revision;
      if (revision !== undefined && (typeof revision !== 'string' || !/^[1-9]\d*$/.test(revision) || !Number.isSafeInteger(Number(revision)))) throw new DomainError(400, 'Use a valid case revision.');
      const record = decisionRecord(store, revision === undefined ? undefined : Number(revision));
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="second-look-decision-r${record.case.revision}.${format}"`);
      if (format === 'json') { res.json(record); return; }
      res.type('html').send(decisionRecordHtml(record));
    } catch (error) { next(error); }
  });
  return router;
}
