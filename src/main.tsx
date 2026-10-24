import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CaseView, ProviderStatus, Role } from '../shared/contracts';
import type { Command } from '../server/domain';
import './styles.css';
import { GamingPanel } from './GamingPanel';
import { ResearchPanel } from './ResearchPanel';
import { DecisionWorkbench } from '../integration/DecisionWorkbench';

const labels: Record<Role, string> = { lp: 'Investor', gp: 'Fund manager', buyer: 'Buyer' };
const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function App() {
  const [session, setSession] = useState<{ hosted: boolean; authenticated: boolean } | null>(null);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  useEffect(() => { void fetch('/api/session').then(r => r.json()).then(value => { setSession(value); if (value.role) setRole(value.role); }).catch(() => setLoginError('Could not reach the app. Reload to try again.')); }, []);
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setSigningIn(true); setLoginError('');
    try {
      const response = await fetch('/api/session/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const value = await response.json(); if (!response.ok) throw new Error(value.error);
      setCode(''); setRole('lp'); setSession({ hosted: true, authenticated: true });
    } catch (e) { setLoginError(e instanceof Error ? e.message : 'Sign-in failed.'); }
    finally { setSigningIn(false); }
  }
  async function selectRole(next: Role) {
    setBusy(true); setError('');
    try {
      if (session?.hosted) {
        const response = await fetch('/api/session/role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: next }) });
        if (!response.ok) throw new Error((await response.json()).error);
      }
      setRole(next); setStep('terms');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not change role.'); }
    finally { setBusy(false); }
  }
  const [rehearsal, setRehearsal] = useState(false);
  useEffect(() => { void fetch('/api/health').then(r => r.json()).then(value => setRehearsal(value.mode === 'saved-research-rehearsal')).catch(() => {}); }, []);
  const [step, setStep] = useState<'games' | 'question' | 'terms'>('terms');
  const [researchVersion, setResearchVersion] = useState(0);
  const [role, setRole] = useState<Role>('lp');
  const [data, setData] = useState<CaseView | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  useEffect(() => {
    if (!session?.authenticated) return;
    const controller = new AbortController();
    setData(null); setError('');
    fetch('/api/case', { headers: { 'x-demo-role': role }, signal: controller.signal })
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [role, session?.authenticated]);
  useEffect(() => {
    if (!session?.authenticated) return;
    fetch('/api/providers').then(r => r.json()).then(setProviders).catch(() => setProviders([]));
  }, [session?.authenticated]);
  const refreshProviders = () => { void fetch('/api/providers').then(r => r.json()).then(setProviders).catch(() => {}); };
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
  const change = review?.lastTermChange;
  const changeAmount = change?.previousGrossReceiptsCents != null && change.revisedGrossReceiptsCents != null ? change.revisedGrossReceiptsCents - change.previousGrossReceiptsCents : null;
  if (!session?.authenticated) return <main className="login"><p className="eyebrow">Second Look · Deal Flow 2026</p><h1>Know the games.<br/>Know the deal.</h1><p>Team presentation access. All financial records in this demo are fictional.</p>{loginError && <p className="error" role="alert">{loginError}</p>}{session ? <form onSubmit={signIn}><label htmlFor="access-code">Team access code</label><input id="access-code" name="password" type="password" autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} required/><button disabled={signingIn}>{signingIn ? 'Signing in…' : 'Open the demo'}</button></form> : <p role="status">Connecting…</p>}</main>;
  return <>
    <a className="skip" href="#main">Skip to case</a>
    <header><a className="brand" href="/">Second Look<span>Know which deal you’re approving.</span></a><span className="tag">Track 4 · Funds</span></header>
    <main id="main">
      <div className="notice"><strong>Fictional fund. {session.hosted ? 'Authenticated team presentation.' : 'Local role simulation.'}</strong> Game evidence comes from Steam and Akta; Nicrron review runs through Roundtable. Participant roles are fictional. This app does not send offers or move money.</div>
      {rehearsal && <div className="notice"><strong>Rehearsal with saved research.</strong> This run starts from a captured sponsor review, not a fresh API call. Decisions below are saved in a separate rehearsal database. External refreshes and new reviews use live providers when configured.</div>}
      <div className="toolbar"><label>View as <select value={role} disabled={busy} onChange={e => void selectRole(e.target.value as Role)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="secondary" disabled={busy} onClick={refresh}>{busy ? 'Working…' : 'Refresh case'}</button>{session.hosted && <button className="secondary" onClick={async () => { await fetch('/api/session/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); location.reload(); }}>Sign out</button>}</div>
      {error && <div role="alert" className="error">{error} Use “Refresh case” to load the latest saved state.</div>}
      {!data ? <p role="status">{error ? 'Case unavailable.' : 'Loading the saved case…'}</p> : <>
        <div className="heading"><div><p className="eyebrow">Offer v{data.offer.version} · case revision {data.revision}</p><h1>Know the games.<br/>Know the deal.</h1><p>{data.title}</p></div><div className="price"><span>Purchase payment</span><strong>{usd(data.offer.purchasePriceCents)}</strong><span>Distribution goes to the {data.offer.distributionRecipient}.</span></div></div>
        {review && <nav className="workflow-nav" aria-label="Review steps">{([['terms', '1. Compare the offers'], ['games', '2. Inspect the games'], ['question', '3. Research the question']] as const).map(([value, label]) => <button key={value} className={step === value ? 'active' : 'secondary'} aria-current={step === value ? 'step' : undefined} onClick={() => setStep(value)}>{label}</button>)}</nav>}
        {review && step === 'terms' && <DecisionWorkbench caseBase="/api/case" onChanged={()=>void refresh()}/>}
        {review?.status === 'terms_changed' && <section className="changed" aria-live="polite"><strong>The terms or supporting answer changed.</strong><p>Your earlier review remains on record, but it does not apply to this version. Review the current response before approving again.</p></section>}
        {review && step === 'games' && <GamingPanel revision={data.revision} onPrepared={() => { setResearchVersion(v => v + 1); refreshProviders(); setStep('question'); }}/>}
        {review && step === 'question' && <ResearchPanel data={data} refreshVersion={researchVersion} onShared={next => { setData(next); setStep('terms'); }} onProviderChange={refreshProviders}/>}
        {(!review || step === 'terms') && data.researchContext && <section className="decision-chain" aria-labelledby="chain-heading">
          <p className="eyebrow">From game evidence to this deal</p><h2 id="chain-heading">{data.researchContext.game} → {data.researchContext.studio} → your fund interest</h2>
          <p>The player evidence raised a question. Only the manager’s response can establish the fictional cash assumption below; player counts and fund NAV exposure do not calculate it.</p>
          <ol><li><strong>Evidence shared:</strong> {data.researchContext.game}, question at revision {data.researchContext.sharedAtRevision}.</li><li><strong>Cash attributable to this interest:</strong> {data.answer ? `${usd(data.answer.distributionCents)} — entered by the fund-manager role, fictional scenario` : 'Unresolved — waiting for the manager’s answer'}.</li><li><strong>Current offer v{data.offer.version}:</strong> distribution goes to the {data.offer.distributionRecipient}. {review?.status === 'approved' ? 'Reviewed for this version.' : 'Investor review still required.'}</li></ol>
        </section>}
        {(!review || step === 'terms') && <div className="columns"><section><p className="eyebrow">02 · Resolve the question</p><h2>Question for the fund manager</h2><p>{data.question}</p>{data.questionSource?.url && <p><a href={data.questionSource.url} target="_blank" rel="noreferrer">Read the source behind this question ↗</a></p>}<p className="waiting">Next owner: {labels[data.nextOwner]}</p>
          {data.answer ? <blockquote>{data.answer.text}<footer>{data.answer.source.label} · answer v{data.answer.version}</footer></blockquote> : <p className="muted">Waiting for the fund manager’s response.</p>}
          {role === 'gp' && <form onSubmit={e => { e.preventDefault(); void act({ kind: 'answer', distributionCents: 10_000_000, text: answer }); }}><p className="muted">Demo assumption: a $100,000 distribution attributable to this LP interest. This is entered by the manager role, not inferred from game performance.</p><button type="button" className="secondary" onClick={() => setAnswer(`Fictional manager response for ${data.researchContext?.game ?? 'the selected investment'}: under the scenario's assumed contractual rights, commercial proceeds flow to the fund. A fictional distribution notice allocates $100,000 to this LP interest. This is not calculated from player counts or the holding's share of fund NAV. Whether the seller keeps it depends on the written sale terms; review the current offer.`)}>Insert labeled fictional manager response</button><label htmlFor="answer">Manager’s explanation of the rights and distribution</label><textarea id="answer" value={answer} onChange={e => setAnswer(e.target.value)} maxLength={5000} required rows={4}/><button disabled={busy || !answer.trim()}>{busy ? 'Saving…' : 'Save fictional response'}</button></form>}
          {role === 'buyer' && <div className="action"><p>Keep the $700,000 purchase payment unchanged and revise the distribution term. This creates a new offer version.</p><button disabled={busy} onClick={() => act({ kind: 'revise', distributionRecipient: data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller' })}>{busy ? 'Saving…' : `Assign distribution to ${data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller'}`}</button></div>}
        </section><section><p className="eyebrow">03 · Review the consequence</p>{review ? <>{change && <div className="term-diff"><span>Offer v{change.previousOffer.version} → v{change.previousOffer.version + 1} · at revision {change.atRevision}</span><strong>{changeAmount === null ? 'Cash effect unresolved' : `${changeAmount < 0 ? '−' : '+'}${usd(Math.abs(changeAmount))} to the seller`}</strong><p>The purchase payment stayed the same. Distribution rights moved from the {change.previousOffer.distributionRecipient} to the {change.previousOffer.distributionRecipient === 'seller' ? 'buyer' : 'seller'}.</p><small>Scenario comparison at the time of the term change; excludes taxes, fees and timing.</small></div>}<h2>{review.grossReceiptsCents === null ? 'Amount not yet established' : `${usd(review.grossReceiptsCents)} gross receipts`}</h2><p className="muted">Fictional scenario. Taxes, fees and timing are excluded. Explicit price adjustment: $0.</p><p>{review.responseText}</p><button disabled={busy || review.status === 'approved' || review.grossReceiptsCents === null} onClick={() => act({ kind: 'approve' })}>{review.status === 'approved' ? 'Response reviewed for this version' : busy ? 'Saving…' : 'Approve this proposed response'}</button><p className="muted">Saves your review in this app. It does not send a response or accept a sale.</p><hr/><p><strong>Investment owner:</strong> {review.ownerEntity}</p><p><strong>Source:</strong> {review.report.label}</p></> : <><h2>Investor review is private</h2><p>This role receives the shared question, response and offer. The API omits the investor’s private review and ownership context.</p><p className="muted">Roles represent fictional participants. The team presenter can operate each role; these are not verified counterparty identities.</p></>}</section></div>}
        {review && step === 'terms' && <section className="history"><p className="eyebrow">04 · Work that survives the session</p><h2>Saved history</h2><button className="secondary print-button" onClick={() => window.print()}>Print decision record / save PDF</button>{review.events.length ? <ol>{review.events.map(event => <li key={event.revision}><strong>Revision {event.revision}</strong> — {event.text}</li>)}</ol> : <p>No responses or revisions yet. Switch to Fund manager to begin.</p>}<p>{review.reviews.length} saved review{review.reviews.length === 1 ? '' : 's'}. State is stored in SQLite and survives a page reload or API restart.</p>{review.reviews.length > 0 && <details className="saved-approvals"><summary>Read the saved approvals</summary>{review.reviews.map(approval => <blockquote key={approval.revision}><strong>Approved revision {approval.revision}</strong><p>{approval.responseText}</p>{approval.researchContext && <p>Research: {approval.researchContext.game} / {approval.researchContext.studio}</p>}{approval.question && <p><strong>Question reviewed:</strong> {approval.question}</p>}{approval.answer && <p><strong>Answer reviewed:</strong> {approval.answer.text}</p>}<footer>{new Date(approval.approvedAt).toLocaleString()} · {approval.revision === data.revision ? 'Current version' : 'Historical — does not approve the current version'}</footer></blockquote>)}</details>}</section>}
      </>}
      <details className="providers"><summary>Provider connections and verification</summary><p>Status reflects calls observed by this running API. Saved task and trace receipts retain the evidence from earlier runs.</p><ul>{providers.map(p => <li key={p.provider} title={p.detail}><strong>{p.provider}</strong><span>{p.status.replaceAll('_', ' ')}</span></li>)}</ul></details>
    </main><footer className="footer">Second Look · Deal Flow 2026 · Synthetic development case</footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
