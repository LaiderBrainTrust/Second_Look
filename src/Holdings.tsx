import { useEffect, useState } from 'react';
import type { GamingSnapshot, HoldingEvidence } from '../shared/gaming';
import { GAMING_HOLDINGS } from '../shared/gaming';
import type { ResearchRun } from '../shared/research';
import { api } from './api';
import { shortDate } from './format';

const percent = (value: number | null) => (value === null ? 'Not enough data' : `${value}%`);

function Evidence({ item }: { item: HoldingEvidence }) {
  const steam = item.steam;
  return <>
    <p className="verdict"><span className={`badge ${item.priority === 'Investigate' ? 'strong' : ''}`}>{item.priority}</span> {item.reason}</p>

    {steam && <>
      <dl className="metrics">
        <div><dt>Before the report</dt><dd className="figure">{percent(steam.baseline.positivePercent)}</dd><dd className="fine">positive, {steam.baseline.count} sampled reviews<br/>{shortDate(steam.baseline.from)} to {shortDate(steam.baseline.to)}</dd></div>
        <div><dt>After the report</dt><dd className="figure">{percent(steam.current.positivePercent)}</dd><dd className="fine">positive, {steam.current.count} sampled reviews<br/>{shortDate(steam.current.from)} to {shortDate(steam.current.to)}</dd></div>
        <div><dt>Change in sample</dt><dd className="figure">{steam.deltaPoints === null ? 'Unknown' : `${steam.deltaPoints > 0 ? '+' : steam.deltaPoints < 0 ? '−' : ''}${Math.abs(steam.deltaPoints)} pp`}</dd><dd className="fine">{steam.playersNow === null ? 'Player count unavailable' : `${steam.playersNow.toLocaleString('en-US')} players online at observation`}<br/>Observed {shortDate(steam.retrievedAt)}</dd></div>
      </dl>
      <details>
        <summary>Player reviews and the limits of this sample</summary>
        <p>At most 100 recent English reviews per window. This is not every player and not a representative survey. Window lengths and volume differ, so a comparison is made only when both windows hold at least 20 reviews. A player count is one observation, not a growth rate.</p>
        <div className="excerpts">{steam.current.excerpts.map((r, i) =>
          <blockquote key={i}>&ldquo;{r.text}&hellip;&rdquo;<footer>{r.positive ? 'Recommended' : 'Not recommended'}, {r.date}</footer></blockquote>)}</div>
        <p>Steam lists the developer as {steam.developers.join(', ') || 'unavailable'} and the publisher as {steam.publishers.join(', ') || 'unavailable'}. Credits do not establish equity ownership or economic rights.</p>
        <a href={steam.sourceUrl} target="_blank" rel="noreferrer">Open the Steam page (external)</a>
      </details>
    </>}

    {item.profile && <section className="studio">
      <h4>Studio, per Akta</h4>
      <p><strong>{item.profile.name}</strong>{item.profile.foundedYear ? `, founded ${item.profile.foundedYear}` : ''}{item.profile.headcount ? `, ${item.profile.headcount} people` : ''}</p>
      <p className="fine">Akta classifies ownership as: {item.profile.ownership ?? 'not available'}. This is provider research, not a verified cap table.</p>
      <details>
        <summary>Akta business profile</summary>
        <p className="prewrap">{item.profile.description}</p>
        {item.profile.website && <a href={item.profile.website} target="_blank" rel="noreferrer">Company website (external)</a>}
        <p className="fine">Retrieved {shortDate(item.profile.retrievedAt)}. Provider-generated summary. Verify commercial claims with the manager and primary documents.</p>
      </details>
    </section>}

    <section className="news">
      <h4>Company news, per Akta</h4>
      {item.news.length
        ? <ul>{item.news.slice(0, 3).map(n => <li key={n.source.id}><a href={n.source.url} target="_blank" rel="noreferrer">{n.claim}</a><span className="fine">{shortDate(n.publishedAt)}. A headline, not a verified commercial conclusion.</span></li>)}</ul>
        : <p className="muted">{item.errors.some(e => e.startsWith('Akta')) ? 'News could not be checked.' : 'No matching articles after the report date on the first page of results. That does not establish that nothing changed.'}</p>}
    </section>
    {item.errors.length > 0 && <p className="alert">{item.errors.join(' ')}</p>}
  </>;
}

export function Holdings({ revision, onPrepared }: { revision: number; onPrepared: () => void }) {
  const [snapshot, setSnapshot] = useState<GamingSnapshot | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<GamingSnapshot | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => { const result = await api('/api/case/gaming'); setSnapshot(result.snapshot); setSavedSnapshot(result.savedSnapshot); };
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (snapshot?.status !== 'fetching') return;
    const timer = setTimeout(() => { void load().catch(e => setError(e.message)); }, 3000);
    return () => clearTimeout(timer);
  }, [snapshot]);

  const displaySnapshot = useSaved && savedSnapshot ? savedSnapshot : snapshot;
  const items = displaySnapshot?.holdings ?? [];
  const item = items.find(h => h.holding.id === selected) ?? items[0];

  async function run(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not complete the request.'); } finally { setBusy(false); }
  }

  return <section aria-labelledby="holdings-heading">
    <div className="section-head">
      <div>
        <h2 id="holdings-heading">Holdings</h2>
        <p className="lede">Three games in the fund. Player and company observations come from Steam and Akta. Each game is shown with its share of fund NAV.</p>
      </div>
      <button className="primary" disabled={busy || snapshot?.status === 'fetching'} onClick={() => void run(async () => { setUseSaved(false); setSnapshot(await api('/api/case/gaming/refresh', { expectedRevision: revision })); })}>
        {snapshot?.status === 'fetching' ? 'Checking Steam and Akta' : snapshot ? 'Refresh external evidence' : 'Check the three holdings'}
      </button>
    </div>
    <p className="fine disclosure">Exposure is each game&rsquo;s share of fund NAV. It is not equity ownership in the studio, a revenue entitlement, or a basis for estimating proceeds.</p>

    {error && <p role="alert" className="alert">{error}</p>}
    {snapshot?.error && <p role="alert" className="alert">{snapshot.error}</p>}
    {snapshot?.status === 'fetching' && <p role="status" className="notice">Checking the three games and their studios. The snapshot is saved, so you can leave and return.</p>}
    {savedSnapshot && snapshot?.id !== savedSnapshot.id && <div className="notice" role="status">
      <p>{useSaved ? `Showing saved evidence captured ${shortDate(savedSnapshot.createdAt)}. This is not a fresh provider response.` : 'An earlier successful evidence check is still available.'}</p>
      <button className="secondary" onClick={() => setUseSaved(!useSaved)}>{useSaved ? 'Show the latest check' : 'Use the previous saved evidence'}</button>
    </div>}

    <div className="holdings" role="group" aria-label="Choose a game">
      {(items.length ? items.map(h => h.holding) : GAMING_HOLDINGS).map(holding => {
        const evidence = items.find(h => h.holding.id === holding.id);
        const on = item?.holding.id === holding.id;
        return <button key={holding.id} className={`holding ${on ? 'on' : ''}`} aria-pressed={on} disabled={!evidence} onClick={() => setSelected(holding.id)}>
          {evidence?.steam?.imageUrl
            ? <img src={evidence.steam.imageUrl} alt="" width="460" height="215" loading="lazy"/>
            : <span className="no-image" aria-hidden="true"/>}
          <span className="holding-text">
            <strong>{holding.game}</strong>
            <span className="fine">{holding.studio}</span>
            <span className="fine">{holding.fundNavExposurePercent}% of fund NAV</span>
            <span className="fine">{evidence ? `Investigation priority ${evidence.rank}` : 'No evidence captured'}</span>
          </span>
        </button>;
      })}
    </div>
    {!items.length && snapshot?.status !== 'fetching' && <p className="muted">No evidence has been captured for this case. Select &ldquo;Check the three holdings&rdquo; to retrieve Steam and Akta observations.</p>}

    {item && <article key={item.holding.id} className="detail" aria-label={`${item.holding.game} evidence`}>
      <header className="detail-head">
        <div><p className="label">{item.holding.studio}</p><h3>{item.holding.game}</h3></div>
        <span className="fine">Observed evidence</span>
      </header>
      <Evidence item={item}/>
      <div className="bridge">
        <div>
          <strong>A popular game is not a distribution.</strong>
          <p>Ask the manager how these observations connect to commercial performance, the fund&rsquo;s rights, and the cash attached to your interest.</p>
        </div>
        <button className="primary" disabled={busy || (!item.steam && !item.news.length)} onClick={() => void run(async () => {
          const prepared: ResearchRun = await api(`/api/case/gaming/${displaySnapshot!.id}/prepare`, { expectedRevision: revision, holdingId: item.holding.id });
          if (prepared.status === 'ready' || prepared.status === 'dispatching') await api(`/api/case/research/${prepared.id}/review`, { expectedRevision: revision, findingId: prepared.selectedFindingId });
          setMessage(prepared.status === 'done' ? 'Opening the completed saved review. No new model call was made.' : 'Saved evidence was sent to the reviewer. The proposed question will appear next.');
          onPrepared();
        })}>{busy ? 'Preparing the question' : 'Turn this evidence into a manager question'}</button>
      </div>
    </article>}
    {message && <p role="status" className="notice">{message}</p>}
    {displaySnapshot && <p className="fine">Evidence captured {shortDate(displaySnapshot.createdAt)}. Report cutoff {displaySnapshot.reportCutoff}. The ordering prioritizes investigation, not expected returns: a sample decline of at least 10 percentage points first, then missing Steam evidence, then the remaining games by sample change and fund exposure.</p>}
  </section>;
}
