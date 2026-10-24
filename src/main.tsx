import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CaseView, ProviderStatus, Role } from '../shared/contracts';
import type { Command } from '../server/domain';
import './styles.css';

const labels: Record<Role, string> = { lp: 'Investor', gp: 'Fund manager', buyer: 'Buyer' };
const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function App() {
  const [role, setRole] = useState<Role>('lp');
  const [data, setData] = useState<CaseView | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('Fictional example: a $100,000 distribution is attributable to this interest. Confirm its treatment in the written offer.');
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    fetch('/api/case', { headers: { 'x-demo-role': role }, signal: controller.signal })
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [role]);
  useEffect(() => {
    fetch('/api/providers').then(r => r.json()).then(setProviders).catch(() => setProviders([]));
  }, []);
  async function refresh() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/case', { headers: { 'x-demo-role': role } });
      const body = await response.json(); if (!response.ok) throw new Error(body.error); setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not refresh.'); }
    finally { setBusy(false); }
  }
  async function act(command: Command) {
    if (!data) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/case/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-role': role }, body: JSON.stringify({ expectedRevision: data.revision, command }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error); setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  }
  const review = data?.privateReview;
  return <>
    <a className="skip" href="#main">Skip to case</a>
    <header><a className="brand" href="/">Second Look<span>Know which deal you’re approving.</span></a><span className="tag">Track 4 · local scaffold</span></header>
    <main id="main">
      <div className="notice"><strong>Fictional records. Local role simulation.</strong> This scaffold does not authenticate real participants, connect providers, send offers, or move money.</div>
      <div className="toolbar"><label>View as <select value={role} disabled={busy} onChange={e => setRole(e.target.value as Role)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="secondary" disabled={busy} onClick={refresh}>{busy ? 'Working…' : 'Refresh case'}</button></div>
      {error && <div role="alert" className="error">{error} Use “Refresh case” to load the latest saved state.</div>}
      {!data ? <p role="status">{error ? 'Case unavailable.' : 'Loading the saved case…'}</p> : <>
        <div className="heading"><div><p className="eyebrow">Offer v{data.offer.version} · case revision {data.revision}</p><h1>Review the deal<br/>you’re getting.</h1><p>{data.title}</p></div><div className="price"><span>Purchase payment</span><strong>{usd(data.offer.purchasePriceCents)}</strong><span>Distribution goes to the {data.offer.distributionRecipient}.</span></div></div>
        {review?.status === 'terms_changed' && <section className="changed" aria-live="polite"><strong>The terms or supporting answer changed.</strong><p>Your earlier review remains on record, but it does not apply to this version. Review the current response before approving again.</p></section>}
        <div className="columns"><section><p className="eyebrow">01 · Resolve the question</p><h2>Who receives the distribution?</h2><p>{data.question}</p><p className="waiting">Next owner: {labels[data.nextOwner]}</p>
          {data.answer ? <blockquote>{data.answer.text}<footer>{data.answer.source.label} · answer v{data.answer.version}</footer></blockquote> : <p className="muted">Waiting for the fund manager’s response.</p>}
          {role === 'gp' && <form onSubmit={e => { e.preventDefault(); void act({ kind: 'answer', distributionCents: 10_000_000, text: answer }); }}><label htmlFor="answer">Fictional response — $100,000 distribution</label><textarea id="answer" value={answer} onChange={e => setAnswer(e.target.value)} maxLength={5000} required rows={4}/><button disabled={busy || !answer.trim()}>{busy ? 'Saving…' : 'Save fictional response'}</button></form>}
          {role === 'buyer' && <div className="action"><p>Keep the $700,000 purchase payment unchanged and revise the distribution term. This creates a new offer version.</p><button disabled={busy} onClick={() => act({ kind: 'revise', distributionRecipient: data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller' })}>{busy ? 'Saving…' : `Assign distribution to ${data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller'}`}</button></div>}
        </section><section><p className="eyebrow">02 · Review the consequence</p>{review ? <><h2>{review.grossReceiptsCents === null ? 'Amount not yet established' : `${usd(review.grossReceiptsCents)} gross receipts`}</h2><p className="muted">Fictional scenario. Taxes, fees and timing are excluded. Explicit price adjustment: $0.</p><p>{review.responseText}</p><button disabled={busy || review.status === 'approved' || review.grossReceiptsCents === null} onClick={() => act({ kind: 'approve' })}>{review.status === 'approved' ? 'Response reviewed for this version' : busy ? 'Saving…' : 'Approve this proposed response'}</button><p className="muted">Saves your review in this app. It does not send a response or accept a sale.</p><hr/><p><strong>Investment owner:</strong> {review.ownerEntity}</p><p><strong>Source:</strong> {review.report.label}</p></> : <><h2>Investor review is private</h2><p>This role receives the shared question, response and offer. The API omits the investor’s private review and ownership context.</p><p className="muted">Roles are simulated for local development; real authentication is still required before hosting.</p></>}</section></div>
        {review && <section className="history"><p className="eyebrow">03 · Work that survives the session</p><h2>Saved history</h2>{review.events.length ? <ol>{review.events.map(event => <li key={event.revision}><strong>Revision {event.revision}</strong> — {event.text}</li>)}</ol> : <p>No responses or revisions yet. Switch to Fund manager to begin.</p>}<p>{review.reviews.length} saved review{review.reviews.length === 1 ? '' : 's'}. State is stored in SQLite and survives a page reload or API restart.</p></section>}
      </>}
      <section className="providers"><h2>Integration work remaining</h2><p>Real provider calls are required for the final entry. None are simulated as successful here.</p><ul>{providers.map(p => <li key={p.provider}><strong>{p.provider}</strong><span>{p.status.replaceAll('_', ' ')}</span></li>)}</ul></section>
    </main><footer className="footer">Second Look · Deal Flow 2026 · Synthetic development case</footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
