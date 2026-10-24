import { useEffect, useState } from 'react';
import type { CaseView } from '../shared/contracts';
import type { Company, ResearchRun } from '../shared/research';
import { api } from './api';
import { dateTime } from './format';

interface Props { data: CaseView; refreshVersion: number; onShared: (data: CaseView) => void; onProviderChange: () => void }

const statusText = (run: ResearchRun) =>
  run.acceptedRevision ? 'Shared with the manager' : ({ fetching: 'Fetching evidence', ready: 'Ready', dispatching: 'Sending to the reviewer', queued: 'Waiting for the reviewer', done: 'Question ready to share', blocked: 'Blocked' } as const)[run.status];

export function Question({ data, refreshVersion, onShared, onProviderChange }: Props) {
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

  // A queued task is reconciled in the background; leaving the page does not cancel it.
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

  return <section aria-labelledby="question-heading">
    <div className="section-head">
      <div>
        <h2 id="question-heading">Question for the manager</h2>
        <p className="lede">The reviewer turns the saved evidence into one question about what cash, if any, belongs to this interest and who keeps it in a sale. The result is a proposal. It is not sent until you share it.</p>
      </div>
    </div>

    {error && <p className="alert" role="alert">{error}</p>}
    <div aria-live="polite">
      {!visibleRuns.length && <p className="muted">No question has been prepared. Choose a game under Holdings and turn its evidence into a question.</p>}
      {visibleRuns.slice(0, 15).map(run => {
        const stale = run.caseRevision !== data.revision;
        const game = run.gamingContext?.holding.game;
        return <article className="run" key={run.id}>
          <header className="run-head">
            <div><p className="label">{game ? `${game}, ${run.gamingContext?.holding.studio}` : 'Company research'}</p><h3>{run.company.name}</h3></div>
            <span className="badge">{statusText(run)}</span>
          </header>
          <p className="fine">Saved {dateTime(run.createdAt)}, at case revision {run.caseRevision}.{run.status === 'done' ? ' This is a retained result. Opening it makes no new model call.' : ''}</p>
          {stale && !run.acceptedRevision && <p className="callout"><strong>Historical research.</strong> The case changed after this check started, so its result cannot be shared as a review of the current terms.</p>}
          {run.error && <p className="alert">{run.error}</p>}
          {run.status === 'fetching' && <p role="status">Fetching dated news from Akta.</p>}

          {run.status === 'ready' && <>
            {run.coverage && <p className="muted">{run.coverage}</p>}
            {run.findings.length
              ? <fieldset disabled={busy || stale}><legend>Choose a development to review</legend>{run.findings.map(f => <div className="finding" key={f.source.id}>
                  <label><input type="radio" name={`finding-${run.id}`} value={f.source.id} checked={(chosen[run.id] ?? run.selectedFindingId) === f.source.id} onChange={() => setChosen(prev => ({ ...prev, [run.id]: f.source.id }))}/><span>{f.claim}<span className="fine">{f.publishedAt.slice(0, 10)}, {f.companyName}</span></span></label>
                  <a href={f.source.url} target="_blank" rel="noreferrer">Read the source (external)</a>
                </div>)}</fieldset>
              : <p className="muted">No matching articles in this result page. Try an earlier cutoff or another company.</p>}
            <button className="primary" disabled={busy || stale || !(chosen[run.id] ?? run.selectedFindingId)} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/review`, { expectedRevision: data.revision, findingId: chosen[run.id] ?? run.selectedFindingId })))}>{busy ? 'Sending' : 'Request review'}</button>
          </>}

          {run.status === 'dispatching' && <button className="primary" disabled={busy} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/review`, { expectedRevision: data.revision })))}>Reconcile the saved request</button>}
          {run.status === 'queued' && <>
            <p role="status" className="notice">Waiting for the reviewer. Leaving this page does not cancel the saved task.</p>
            <button className="secondary" disabled={busy} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/check`, {})))}>Check the saved task</button>
          </>}
          {run.status === 'blocked' && run.taskId && <button className="secondary" disabled={busy} onClick={() => void action(async () => replace(await api(`/api/case/research/${run.id}/check`, {})))}>Recheck the saved result</button>}

          {run.result && <>
            <blockquote className="proposal">
              <p className="label">Proposed question</p>
              {run.result.question}
              <footer>{run.result.explanation}</footer>
            </blockquote>
            <div className="share">
              <p className="fine">Sharing replaces the case question, clears any earlier answer, and requires a new response from the fund manager. It sends no email and accepts no sale.</p>
              <button className="primary" disabled={busy || stale || Boolean(run.acceptedRevision)} onClick={() => void action(async () => { onShared(await api(`/api/case/research/${run.id}/share`, { expectedRevision: data.revision })); await load(); })}>
                {run.acceptedRevision ? 'Shared with the fund manager' : busy ? 'Sharing' : 'Share with the fund manager'}
              </button>
            </div>
          </>}

          {(run.taskId || run.result) && <details className="integrations">
            <summary>Evidence and integrations</summary>
            {run.taskId && <p className="fine">Roundtable task <code>{run.taskId}</code></p>}
            {run.result && <>
              <p className="fine">Model: {run.result.model ?? run.result.method}. PRISM trace: {run.result.trace?.status.replaceAll('_', ' ') ?? 'not recorded for this older review'}{run.result.trace?.id ? <> <code>{run.result.trace.id}</code></> : null}</p>
              <ul>{run.result.sources.map(s => <li key={`${s.path}:${s.version}`}><code>{s.path} @ {s.version}</code></li>)}</ul>
            </>}
          </details>}
        </article>;
      })}
    </div>
    {runs.length > visibleRuns.length || showAll ? <button className="secondary" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show the latest game review only' : `Show all ${runs.length} saved research checks`}</button> : null}

    <details className="more">
      <summary>Research another company with Akta</summary>
      <form className="inline-form" onSubmit={e => { e.preventDefault(); void action(async () => {
        const result = await api('/api/research/search', { query }); setCompanies(result.companies); setCompanyId(''); setShowAll(true);
        if (!result.companies.length) setError('No companies found. Try a company website or another name.');
      }); }}>
        <div><label htmlFor="company-search">Company name or website</label><input id="company-search" name="company" value={query} onChange={e => setQuery(e.target.value)} required maxLength={300}/></div>
        <button className="secondary" disabled={busy}>{busy ? 'Working' : 'Search companies'}</button>
      </form>
      {companies.length > 0 && <form className="inline-form" onSubmit={e => { e.preventDefault(); void action(async () => {
        replace(await api('/api/case/research', { expectedRevision: data.revision, companyId, after }));
      }); }}>
        <div><label htmlFor="company-match">Confirm the company</label><select id="company-match" value={companyId} onChange={e => setCompanyId(e.target.value)} required><option value="">Choose the matching company</option>{companies.map(c => <option key={c.uuid} value={c.uuid}>{c.name}, {c.website || c.uuid}</option>)}</select></div>
        <div><label htmlFor="report-cutoff">Report cutoff date</label><input id="report-cutoff" type="date" value={after} onChange={e => setAfter(e.target.value)} required/></div>
        <button className="secondary" disabled={busy || !companyId}>{busy ? 'Fetching' : 'Find changes since the report'}</button>
      </form>}
    </details>
  </section>;
}
