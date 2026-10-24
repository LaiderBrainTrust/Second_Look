import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CaseView, ProviderStatus, Role } from '../shared/contracts';
import type { Command } from '../server/domain';
import './styles.css';
import { api } from './api';
import { roleLabels, SCENARIO_DISTRIBUTION_CENTS, scenarioAnswer } from './format';
import { Login } from './Login';
import { DealRail } from './DealRail';
import { Holdings } from './Holdings';
import { Question } from './Question';
import { Review, Respond } from './Review';
import { History } from './History';
import { Presenter } from './Presenter';
import { DecisionWorkbench } from '../integration/DecisionWorkbench';

type Tab = 'holdings' | 'question' | 'review' | 'offers' | 'history';
const tabs: [Tab, string][] = [['holdings', 'Holdings'], ['question', 'Question'], ['review', 'Review'], ['offers', 'Compare offers'], ['history', 'Record']];

function App() {
  const [session, setSession] = useState<{ hosted: boolean; authenticated: boolean; role?: Role } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState<Role>('lp');
  const [data, setData] = useState<CaseView | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [rehearsal, setRehearsal] = useState(false);
  const [tab, setTab] = useState<Tab>('holdings');
  const [researchVersion, setResearchVersion] = useState(0);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/session').then(value => { setSession(value); if (value.role) setRole(value.role); })
      .catch(() => setLoadError('Could not reach the application. Reload to try again.'));
    api('/api/health').then(value => setRehearsal(value.mode === 'saved-research-rehearsal')).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.authenticated) return;
    const controller = new AbortController();
    setData(null); setError('');
    api<CaseView>('/api/case', undefined, role, controller.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [role, session?.authenticated]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [tab]);

  const refreshProviders = () => { void api('/api/providers').then(setProviders).catch(() => setProviders([])); };
  useEffect(() => { if (session?.authenticated) refreshProviders(); }, [session?.authenticated]);

  async function guarded(work: () => Promise<void>, fallback: string) {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : fallback); } finally { setBusy(false); }
  }
  const refresh = () => guarded(async () => setData(await api<CaseView>('/api/case', undefined, role)), 'Could not refresh.');
  const act = (command: Command) => data && guarded(async () => {
    setData(await api<CaseView>('/api/case/commands', { expectedRevision: data.revision, command }, role));
  }, 'Could not save.');
  const selectRole = (next: Role) => guarded(async () => {
    if (session?.hosted) await api('/api/session/role', { role: next });
    setRole(next); setTab('review');
  }, 'Could not change the role.');
  const signOut = async () => { await api('/api/session/logout', {}).catch(() => {}); location.reload(); };

  if (!session?.authenticated) {
    return <Login ready={Boolean(session)} loadError={loadError} onSignedIn={() => { setRole('lp'); setSession({ hosted: true, authenticated: true }); }}/>;
  }

  const review = data?.privateReview;
  const investor = role === 'lp' && Boolean(review);
  const game = data?.researchContext?.game;

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="topbar">
      <a className="brand" href="/">Second Look</a>
      <div className="topbar-right">
        <span className="viewing">Viewing as {roleLabels[role]}</span>
        <button className="secondary" onClick={() => setPresenterOpen(true)}>Presenter</button>
      </div>
    </header>

    <main id="main">
      {error && <div className="alert banner" role="alert">{error} <button className="link" onClick={() => void refresh()}>Reload the latest case</button></div>}
      {!data
        ? <p role="status" className="muted pad">{error ? 'The case is unavailable.' : 'Loading the saved case'}</p>
        : <div className="shell">
            <DealRail data={data}/>
            <div className="workspace">
              {game && investor && <p className="thread">Selected game <strong>{game}</strong> through {data.researchContext?.studio} to this interest</p>}
              {investor && <>
                <nav className="tabs no-print" aria-label="Sections">
                  {tabs.map(([value, label]) => <button key={value} className="tab" aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{label}</button>)}
                </nav>
                {tab === 'holdings' && <Holdings revision={data.revision} onPrepared={() => { setResearchVersion(v => v + 1); refreshProviders(); setTab('question'); }}/>}
                {tab === 'question' && <Question data={data} refreshVersion={researchVersion} onProviderChange={refreshProviders} onShared={next => { setData(next); setTab('review'); }}/>}
                {tab === 'review' && <Review data={data} busy={busy} onApprove={() => void act({ kind: 'approve' })}/>}
                {tab === 'offers' && <DecisionWorkbench caseBase="/api/case" onChanged={() => void refresh()}/>}
                {tab === 'history' && <History data={data}/>}
              </>}
              {!investor && role !== 'lp' && <Respond data={data} role={role} busy={busy} answer={answer} setAnswer={setAnswer}
                onAnswer={() => void act({ kind: 'answer', distributionCents: SCENARIO_DISTRIBUTION_CENTS, text: answer })}
                onRevise={() => void act({ kind: 'revise', distributionRecipient: data.offer.distributionRecipient === 'seller' ? 'buyer' : 'seller' })}/>}
              {!investor && role === 'lp' && <p className="muted">The investor view is unavailable for this case.</p>}
            </div>
          </div>}
    </main>

    <footer className="footer"><span>Second Look, Deal Flow 2026</span><span>Illustrative fund and deal. This application sends no offers and moves no money.</span></footer>

    <Presenter open={presenterOpen} onClose={() => setPresenterOpen(false)} role={role} onRole={next => void selectRole(next).then(() => setPresenterOpen(false))} busy={busy}
      hosted={Boolean(session.hosted)} rehearsal={rehearsal} onRefresh={() => void refresh()} onSignOut={() => void signOut()} providers={providers}
      canInsertAnswer={role === 'gp' && Boolean(data)} onInsertAnswer={() => setAnswer(scenarioAnswer(game ?? 'the selected investment'))}/>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
