import { useEffect, useState } from 'react';
import type { CaseView } from '../shared/contracts';
import type { Company, ResearchRun } from '../shared/research';

async function api(path: string, body?: unknown) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-role': 'lp' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'The request failed.');
  return data;
}
export function ResearchPanel({ data, refreshVersion, onShared, onProviderChange }: { data: CaseView; refreshVersion: number; onShared: (data: CaseView) => void; onProviderChange: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('Pounce Light');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [after, setAfter] = useState('2026-09-30');
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const replace = (run: ResearchRun) => setRuns(previous => previous.some(r => r.id === run.id) ? previous.map(r => r.id === run.id ? run : r) : [run, ...previous]);
  async function load() { setRuns((await api('/api/case/research')).runs); }
  useEffect(() => { void load().catch(e => setError(e.message)); }, [data.revision, refreshVersion]);
  useEffect(() => {
    const pending = runs.filter(run => run.status === 'queued');
    if (!pending.length) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      for (const run of pending) {
        try { const next = await api(`/api/case/research/${run.id}/check`, {}); if (!stopped) replace(next); }
        catch (e) { if (!stopped) setError(e instanceof Error ? e.message : 'Could not check the saved task.'); }
      }
      if (!stopped) onProviderChange();
    }, 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [runs]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); onProviderChange(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not complete the request.'); await load().catch(() => {}); }
    finally { setBusy(false); }
  }
  const currentRuns = runs.filter(run => run.gamingContext && run.caseRevision === data.revision);
  const visibleRuns = showAll ? runs : currentRuns.length ? currentRuns.slice(0, 1) : runs.filter(run => run.gamingContext).slice(0, 1);
  return <section className="research" aria-labelledby="research-heading">
    <p className="eyebrow">Live external research · Akta + Roundtable</p>
    <h2 id="research-heading">Your evidence → a question worth asking</h2>
    <p>Find a dated development, ask the reviewer to check its source, then share the proposed question with the fund manager.</p>
    <p className="muted">The fund is fictional. The company and news are real demonstration inputs; no holding in this fund is established.</p>
    <details className="extra-research"><summary>Research another company with Akta</summary>
    <form className="research-search" onSubmit={e => { e.preventDefault(); void action(async () => {
      const result = await api('/api/research/search', { query }); setCompanies(result.companies); setCompanyId(''); setShowAll(true);
      if (!result.companies.length) setError('No companies found. Try a company website or another name.');
    }); }}>
      <div><label htmlFor="company-search">Company name or website</label><input id="company-search" name="company" value={query} onChange={e => setQuery(e.target.value)} required maxLength={300}/></div>
      <button disabled={busy}>{busy ? 'Working…' : 'Search companies'}</button>
    </form>
    {companies.length > 0 && <form className="research-search" onSubmit={e => { e.preventDefault(); void action(async () => {
      replace(await api('/api/case/research', { expectedRevision: data.revision, companyId, after }));
    }); }}>
      <div><label htmlFor="company-match">Confirm the company</label><select id="company-match" value={companyId} onChange={e => setCompanyId(e.target.value)} required><option value="">Choose the matching company…</option>{companies.map(c => <option key={c.uuid} value={c.uuid}>{c.name} — {c.website || c.uuid}</option>)}</select></div>
      <div><label htmlFor="report-cutoff">Report cutoff date</label><input id="report-cutoff" type="date" value={after} onChange={e => setAfter(e.target.value)} required/></div>
      <button disabled={busy || !companyId}>{busy ? 'Fetching…' : 'Find changes since report'}</button>
    </form>}
    </details>
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{!visibleRuns.length && <p className="waiting">Choose a game in step 1 and turn its evidence into a manager question.</p>}{visibleRuns.slice(0, 15).map(run => {
      const stale = run.caseRevision !== data.revision;
      return <article className="research-run" key={run.id}>
        <div className="research-title"><h3>{run.company.name}</h3><span>Case revision {run.caseRevision} · {run.acceptedRevision ? 'Question shared' : run.status}</span></div>
        {stale && !run.acceptedRevision && <p className="changed"><strong>Historical research.</strong> The case changed after this check started. Its result cannot be shared as a review of the current terms.</p>}
        {run.error && <p className="error">{run.error}</p>}
        {run.status === 'fetching' && <p>Fetching dated news from Akta…</p>}
        {run.status === 'ready' && <>
          <p className="muted">{run.coverage}</p>
          {run.findings.length ? <fieldset disabled={busy || stale}><legend>Choose a development to review</legend>{run.findings.map(f => <div className="finding" key={f.source.id}><label><input type="radio" name={`finding-${run.id}`} value={f.source.id} checked={(chosen[run.id] ?? run.selectedFindingId) === f.source.id} onChange={() => setChosen(prev => ({ ...prev, [run.id]: f.source.id }))}/><span>{f.claim}<small>{f.publishedAt.slice(0, 10)} · {f.companyName}</small></span></label><a href={f.source.url} target="_blank" rel="noreferrer">Read source ↗</a></div>)}</fieldset> : <p>No matching articles in this result page. Try an earlier cutoff or another company.</p>}
          <button disabled={busy || stale || !(chosen[run.id] ?? run.selectedFindingId)} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/review`, { expectedRevision: data.revision, findingId: chosen[run.id] ?? run.selectedFindingId })))}>{busy ? 'Sending…' : 'Request Roundtable review'}</button>
        </>}
        {run.status === 'dispatching' && <button disabled={busy} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/review`, { expectedRevision: data.revision })))}>Reconcile saved request</button>}
        {run.status === 'queued' && <><p>Waiting for the Roundtable reviewer. Leaving this page does not cancel the saved task.</p><button className="secondary" disabled={busy} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/check`, {})))}>Check saved task</button></>}
        {run.status === 'blocked' && run.taskId && <button className="secondary" disabled={busy} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/check`, {})))}>Recheck saved result</button>}
        {run.taskId && <p className="muted">Roundtable task: <code>{run.taskId}</code></p>}
        {run.result && <><blockquote>{run.result.question}<footer>{run.result.explanation}</footer></blockquote><p className="muted">PRISM trace: {run.result.trace?.status.replaceAll('_', ' ') ?? 'not recorded for this older review'}{run.result.trace?.id ? ` · ${run.result.trace.id}` : ''}</p><details><summary>Source versions used by the reviewer</summary><ul>{run.result.sources.map(s => <li key={`${s.path}:${s.version}`}><code>{s.path} @ {s.version}</code></li>)}</ul></details><p className="muted">Sharing replaces the case question, clears the previous answer, and requires a fresh fund-manager response. It sends no email and accepts no sale.</p><button disabled={busy || stale || Boolean(run.acceptedRevision)} onClick={() => void action(async () => { onShared(await api(`/api/case/research/${run.id}/share`, { expectedRevision: data.revision })); await load(); })}>{run.acceptedRevision ? 'Question shared with fund manager' : busy ? 'Sharing…' : 'Share question with fund manager'}</button></>}
      </article>;
    })}</div>
    {runs.length > visibleRuns.length || showAll ? <button className="secondary" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show latest gaming review only' : `Show all ${runs.length} saved research checks`}</button> : null}
  </section>;
}
